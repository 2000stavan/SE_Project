package com.isms;

import com.isms.domain.ProductService;
import com.isms.domain.StockRecordService;
import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.model.StockRecord;
import com.isms.model.StockRecordId;
import com.isms.repository.StockRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class StockConcurrencyTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private StockRecordService stockRecordService;

    @Autowired
    private StockRecordRepository stockRecordRepository;

    @Test
    @DisplayName("StockConcurrencyTest: 50 concurrent deductions never drive stock negative (BR-3)")
    void testConcurrentStockDeductionsNeverNegative() throws Exception {
        String sku = "SKU-CONCUR-" + System.currentTimeMillis();
        String loc = "WH-01";

        // Create product with 20 initial units
        Product product = new Product(sku, "Concurrent Test Item", "Electronics", BigDecimal.valueOf(100), 5, "PCS");
        productService.create(product);
        stockRecordService.updateStock(sku, loc, 20);

        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger failures = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    stockRecordService.deductStock(sku, loc, 1);
                    successes.incrementAndGet();
                } catch (ApiException e) {
                    if ("INSUFFICIENT_STOCK".equals(e.getCode())) {
                        failures.incrementAndGet();
                    }
                } catch (Exception e) {
                    // unexpected
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Start all threads simultaneously
        startLatch.countDown();
        finishLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Exactly 20 successes, 30 out-of-stock failures
        assertEquals(20, successes.get(), "Exactly 20 deductions should have succeeded");
        assertEquals(30, failures.get(), "Remaining 30 deductions should have failed with INSUFFICIENT_STOCK");

        StockRecord finalStock = stockRecordRepository.findById(new StockRecordId(sku, loc)).orElseThrow();
        assertEquals(0, finalStock.getQuantityOnHand(), "Final stock must be exactly 0, never negative");
    }

    @Test
    @DisplayName("C1.6: Two simultaneous attempts on last unit: one succeeds, one gets out-of-stock conflict")
    void testLastUnitConflict() throws Exception {
        String sku = "SKU-LAST-" + System.currentTimeMillis();
        String loc = "WH-01";

        Product product = new Product(sku, "Last Unit Item", "Electronics", BigDecimal.valueOf(50), 2, "PCS");
        productService.create(product);
        stockRecordService.updateStock(sku, loc, 1);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(2);

        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger conflicts = new AtomicInteger(0);

        for (int i = 0; i < 2; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    stockRecordService.deductStock(sku, loc, 1);
                    successes.incrementAndGet();
                } catch (ApiException e) {
                    if ("INSUFFICIENT_STOCK".equals(e.getCode())) {
                        conflicts.incrementAndGet();
                    }
                } catch (Exception e) {
                    // unexpected
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successes.get(), "Only 1 transaction should claim the last unit");
        assertEquals(1, conflicts.get(), "The losing transaction should receive out-of-stock conflict");

        StockRecord finalStock = stockRecordRepository.findById(new StockRecordId(sku, loc)).orElseThrow();
        assertEquals(0, finalStock.getQuantityOnHand());
    }
}
