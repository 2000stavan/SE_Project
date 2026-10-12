package com.isms;

import com.isms.domain.ProductService;
import com.isms.domain.SalesPersonnelService;
import com.isms.domain.StockRecordService;
import com.isms.model.Product;
import com.isms.model.StockRecord;
import com.isms.repository.StockRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Sync.Channel.Conflict + BR-3 through the full sales path: when two sales race for the last unit, exactly one
 * order is created and stock ends at 0 (never an oversell, never negative).
 */
@SpringBootTest
class SalesConcurrencyTest {

    @Autowired
    private SalesPersonnelService salesPersonnelService;
    @Autowired
    private ProductService productService;
    @Autowired
    private StockRecordService stockRecordService;
    @Autowired
    private StockRecordRepository stockRecordRepository;

    @Test
    @DisplayName("Two simultaneous sales of the last unit: one succeeds, one is rejected, stock = 0")
    void lastUnitIsSoldOnce() throws Exception {
        String sku = "SKU-LASTUNIT-" + System.currentTimeMillis();
        productService.create(new Product(sku, "Last unit", "Test", BigDecimal.TEN, 1, "PCS"));
        stockRecordService.updateStock(sku, "WH-01", 1);

        int threads = 6;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new java.util.ArrayList<>();
        for (int i = 0; i < threads; i++) {
            Callable<Boolean> task = () -> {
                start.await();
                try {
                    salesPersonnelService.logPhysicalSale("USR-SALES-1", "WH-01", List.of(Map.of("sku_id", sku, "quantity", 1)), "Race");
                    return true;
                } catch (Exception e) {
                    return false;
                }
            };
            results.add(pool.submit(task));
        }
        start.countDown();
        int ok = 0;
        for (Future<Boolean> f : results) if (f.get()) ok++;
        pool.shutdown();

        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, "WH-01").orElseThrow();
        assertEquals(1, ok, "exactly one of the racing sales may succeed");
        assertEquals(0, stock.getQuantityOnHand(), "stock must end at exactly 0");
    }
}
