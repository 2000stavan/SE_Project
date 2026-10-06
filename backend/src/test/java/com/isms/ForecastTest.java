package com.isms;

import com.isms.domain.ForecastService;
import com.isms.domain.ProductService;
import com.isms.domain.StockRecordService;
import com.isms.model.Product;
import com.isms.model.Supplier;
import com.isms.repository.ProductRepository;
import com.isms.repository.SupplierRepository;
import com.isms.trace.CallTrace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ForecastTest {

    @Autowired
    private ForecastService forecastService;

    @Autowired
    private ProductService productService;

    @Autowired
    private StockRecordService stockRecordService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private CallTrace callTrace;

    private String testSku;
    private final String locationId = "WH-01";

    @BeforeEach
    void setUp() {
        callTrace.clear();
        testSku = "SKU-FC-" + System.currentTimeMillis();

        Product product = new Product(
                testSku,
                "Forecasting Widget",
                "Analytics",
                BigDecimal.valueOf(45.00),
                20,
                "PCS"
        );
        productService.create(product);

        stockRecordService.updateStock(testSku, locationId, 15); // near or below reorder point (20)

        if (supplierRepository.findByIsActiveTrueOrderByRatingDesc().isEmpty()) {
            supplierRepository.save(new Supplier("SUP-FC-01", "Forecasting Vendor", "fc@vendor.com", BigDecimal.valueOf(4.5), 7, "[]", true));
        }
    }

    @Test
    @DisplayName("E1.1 & E1.2: Generate demand forecast, detect seasonality, and verify contract calls")
    void testForecastPipelineAndContractCalls() {
        Map<String, Object> result = forecastService.runPipeline(testSku, locationId);

        assertNotNull(result);
        assertTrue(result.containsKey("forecast"));
        assertTrue(result.containsKey("seasonality"));
        assertTrue(result.containsKey("recommendation"));

        @SuppressWarnings("unchecked")
        Map<String, Object> fcData = (Map<String, Object>) result.get("forecast");
        assertEquals(testSku, fcData.get("sku_id"));
        assertEquals(locationId, fcData.get("location_id"));
        assertTrue((int) fcData.get("predicted_demand") > 0);
        assertTrue((int) fcData.get("recommended_reorder_qty") > 0);

        // Verify that CallTrace intercepted the diagram methods in order:
        // ForecastService.generateDemand -> detectSeasonality -> recommendReorder
        List<String> actualCalls = callTrace.getCalls();
        assertTrue(actualCalls.contains("ForecastService.generateDemand"),
                "Expected call trace to contain ForecastService.generateDemand, was: " + actualCalls);
        assertTrue(actualCalls.contains("ForecastService.detectSeasonality"),
                "Expected call trace to contain ForecastService.detectSeasonality, was: " + actualCalls);
        assertTrue(actualCalls.contains("ForecastService.recommendReorder"),
                "Expected call trace to contain ForecastService.recommendReorder, was: " + actualCalls);

        int idxGen = actualCalls.indexOf("ForecastService.generateDemand");
        int idxSeason = actualCalls.indexOf("ForecastService.detectSeasonality");
        int idxReorder = actualCalls.indexOf("ForecastService.recommendReorder");
        assertTrue(idxGen <= idxSeason, "generateDemand should precede or equal detectSeasonality");
        assertTrue(idxSeason <= idxReorder, "detectSeasonality should precede or equal recommendReorder");
    }

    @Test
    @DisplayName("E1.3 & E1.4: Reorder suggestions return pre-filled PO draft payload")
    void testReorderSuggestionsAndPoPayload() {
        List<Map<String, Object>> suggestions = forecastService.getReorderSuggestions();
        assertNotNull(suggestions);

        Map<String, Object> target = suggestions.stream()
                .filter(s -> testSku.equals(s.get("sku_id")))
                .findFirst()
                .orElse(null);

        assertNotNull(target, "Expected test SKU to appear in reorder suggestions since stock (15) <= reorder_point (20)");
        assertEquals(testSku, target.get("sku_id"));
        assertEquals(15, target.get("quantity_on_hand"));
        assertEquals(20, target.get("reorder_point"));
        assertTrue((int) target.get("suggested_order_qty") >= 20);

        @SuppressWarnings("unchecked")
        Map<String, Object> poPayload = (Map<String, Object>) target.get("suggested_po_payload");
        assertNotNull(poPayload);
        assertNotNull(poPayload.get("supplier_id"));
        assertNotNull(poPayload.get("expected_date"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) poPayload.get("lines");
        assertFalse(lines.isEmpty());
        assertEquals(testSku, lines.get(0).get("sku_id"));
        assertEquals(locationId, lines.get(0).get("location_id"));
    }

    @Test
    @DisplayName("E1.5 & E1.6: Stock analytics returns correct counts and valuation")
    void testStockAnalytics() {
        Map<String, Object> stockAnalytics = forecastService.getStockAnalytics();

        assertNotNull(stockAnalytics);
        assertTrue((int) stockAnalytics.get("total_products") >= 1);
        assertTrue((long) stockAnalytics.get("total_units_on_hand") >= 15);
        assertNotNull(stockAnalytics.get("total_inventory_valuation"));
        assertTrue((int) stockAnalytics.get("low_stock_count") >= 1);
    }
}
