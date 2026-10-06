package com.isms;

import com.isms.domain.*;
import com.isms.error.ApiException;
import com.isms.model.*;
import com.isms.model.enums.SalesStatus;
import com.isms.repository.ProductRepository;
import com.isms.repository.SalesOrderRepository;
import com.isms.repository.StockRecordRepository;
import com.isms.trace.CallTrace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class Seq3SalesTest {

    @Autowired
    private SalesPersonnelService salesPersonnelService;

    @Autowired
    private SalesOrderService salesOrderService;

    @Autowired
    private ProductService productService;

    @Autowired
    private StockRecordService stockRecordService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StockRecordRepository stockRecordRepository;

    @Autowired
    private SalesOrderRepository salesOrderRepository;

    @Autowired
    private CallTrace callTrace;

    @BeforeEach
    void setUp() {
        callTrace.clear();
    }

    @Test
    @DisplayName("Sequence 3: Processed Physical Sale flow (Search -> Create -> Deduct -> Invoice)")
    void testSequence3PhysicalSaleProcessed() {
        String sku = "SKU-SEQ3-PHYS-" + System.currentTimeMillis();
        String loc = "WH-01";

        // Seed product and 100 units of stock
        Product p = new Product(sku, "Retail Smartphone", "Electronics", BigDecimal.valueOf(15000.00), 5, "PCS");
        productService.create(p);
        stockRecordService.updateStock(sku, loc, 100);

        callTrace.clear();

        // 1. SalesPersonnel.logPhysicalSale
        Map<String, Object> saleResult = salesPersonnelService.logPhysicalSale(
                "USR-SALES-1",
                loc,
                List.of(Map.of("sku_id", sku, "quantity", 5)),
                "Walk-in Customer John"
        );

        String orderId = (String) saleResult.get("orderId");
        assertNotNull(orderId);
        assertEquals(SalesStatus.COMPLETED.getValue(), saleResult.get("status"));

        // Verify stock deducted from 100 to 95
        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(95, stock.getQuantityOnHand(), "Stock must be deducted by sold quantity (5)");

        // Verify Invoice PDF file generated on disk
        File invoiceFile = new File("./storage/invoices/" + orderId + ".pdf");
        assertTrue(invoiceFile.exists(), "Invoice PDF must be created at storage/invoices/{order_id}.pdf");
        assertTrue(invoiceFile.length() > 0, "Invoice PDF must not be empty");

        // Verify message order matching Sequence 3
        List<String> actualCalls = callTrace.getCalls();
        assertTrue(actualCalls.contains("SalesPersonnelService.logPhysicalSale"), "Must contain SalesPersonnelService.logPhysicalSale");
        assertTrue(actualCalls.contains("ProductService.search"), "Must contain ProductService.search");
        assertTrue(actualCalls.contains("SalesOrderService.createOrder"), "Must contain SalesOrderService.createOrder");
        assertTrue(actualCalls.contains("StockRecordService.deductStock"), "Must contain StockRecordService.deductStock");
        assertTrue(actualCalls.contains("SalesOrderService.generateInvoice"), "Must contain SalesOrderService.generateInvoice");

        int idxLog = actualCalls.indexOf("SalesPersonnelService.logPhysicalSale");
        int idxSearch = actualCalls.indexOf("ProductService.search");
        int idxCreate = actualCalls.indexOf("SalesOrderService.createOrder");
        int idxDeduct = actualCalls.indexOf("StockRecordService.deductStock");
        int idxInvoice = actualCalls.indexOf("SalesOrderService.generateInvoice");

        assertTrue(idxLog <= idxSearch, "logPhysicalSale initiates Product.search");
        assertTrue(idxSearch < idxCreate, "Product.search precedes createOrder");
        assertTrue(idxCreate <= idxDeduct, "createOrder leads to deductStock");
        assertTrue(idxDeduct < idxInvoice, "deductStock precedes generateInvoice");
    }

    @Test
    @DisplayName("Sequence 3: Processed Webhook Sale flow (processWebhook -> Deduct -> Invoice)")
    void testSequence3WebhookSaleProcessed() throws Exception {
        String sku = "SKU-SEQ3-WEBHOOK-" + System.currentTimeMillis();
        String loc = "WH-01";

        Product p = new Product(sku, "Wireless Headphones", "Audio", BigDecimal.valueOf(2500.00), 5, "PCS");
        productService.create(p);
        stockRecordService.updateStock(sku, loc, 50);

        callTrace.clear();

        // Marketplace webhook payload for Amazon
        String mktOrderId = "AMZ-" + System.currentTimeMillis();
        Map<String, Object> payload = Map.of(
                "order_id", mktOrderId,
                "event", "order-paid",
                "customer_info", "Amazon Prime Customer",
                "lines", List.of(Map.of("sku_id", sku, "quantity", 2, "location_id", loc))
        );

        // Compute HMAC with secret1 (amazon)
        byte[] rawBytes = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(payload);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret1".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = HexFormat.of().formatHex(mac.doFinal(rawBytes));

        // Process webhook
        Map<String, Object> res = salesOrderService.processWebhook("amazon", sig, rawBytes, payload);
        assertEquals("processed", res.get("status"));

        // Verify stock deducted from 50 to 48
        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(48, stock.getQuantityOnHand());

        // Verify Invoice generated
        List<String> actualCalls = callTrace.getCalls();
        assertTrue(actualCalls.contains("SalesOrderService.processWebhook"));
        assertTrue(actualCalls.contains("StockRecordService.deductStock"));
        assertTrue(actualCalls.contains("SalesOrderService.generateInvoice"));
    }

    @Test
    @DisplayName("Sequence 3: Not-processed / Rejected branch (Insufficient stock creates REJECTED order & notifies manager)")
    void testSequence3InsufficientStockRejectedBranch() {
        String sku = "SKU-SEQ3-SHORT-" + System.currentTimeMillis();
        String loc = "WH-01";

        Product p = new Product(sku, "Rare Collectible", "Collectibles", BigDecimal.valueOf(50000.00), 1, "PCS");
        productService.create(p);
        // Only 2 units in stock
        stockRecordService.updateStock(sku, loc, 2);

        callTrace.clear();

        // Attempting to buy 5 units when only 2 are in stock
        ApiException ex = assertThrows(ApiException.class, () -> salesPersonnelService.logPhysicalSale(
                "USR-SALES-1",
                loc,
                List.of(Map.of("sku_id", sku, "quantity", 5)),
                "Customer Bob"
        ));

        assertEquals("INSUFFICIENT_STOCK", ex.getCode());

        // Verify stock was not deducted (remains 2)
        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(2, stock.getQuantityOnHand(), "Stock must not be deducted when order is rejected");

        // Verify message trace
        List<String> calls = callTrace.getCalls();
        assertTrue(calls.contains("SalesPersonnelService.logPhysicalSale"));
        assertTrue(calls.contains("ProductService.search"));
        assertTrue(calls.contains("SalesOrderService.createOrder"));
        // deductStock must NOT be called
        assertFalse(calls.contains("StockRecordService.deductStock"), "deductStock must NOT be called on rejected order");
    }

    @Test
    @DisplayName("Sequence 3: Optional Return branch reverses stock and sets status to RETURNED")
    void testSequence3ReturnBranch() {
        String sku = "SKU-SEQ3-RET-" + System.currentTimeMillis();
        String loc = "WH-01";

        Product p = new Product(sku, "Returned Blender", "Appliances", BigDecimal.valueOf(3000.00), 5, "PCS");
        productService.create(p);
        stockRecordService.updateStock(sku, loc, 20);

        // Make physical sale of 3 units -> stock becomes 17
        Map<String, Object> sale = salesPersonnelService.logPhysicalSale(
                "USR-SALES-1",
                loc,
                List.of(Map.of("sku_id", sku, "quantity", 3)),
                "Customer Charlie"
        );
        String orderId = (String) sale.get("orderId");
        assertEquals(17, stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow().getQuantityOnHand());

        callTrace.clear();

        // Opt: SalesOrder.processReturn
        salesOrderService.processReturn(orderId);

        // Verify stock is restored from 17 back to 20
        StockRecord restoredStock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(20, restoredStock.getQuantityOnHand(), "Stock must be restored on return");

        // Verify order status updated to RETURNED
        SalesOrder order = salesOrderRepository.findById(orderId).orElseThrow();
        assertEquals(SalesStatus.RETURNED, order.getStatus());

        List<String> calls = callTrace.getCalls();
        assertTrue(calls.contains("SalesOrderService.processReturn"));
    }
}
