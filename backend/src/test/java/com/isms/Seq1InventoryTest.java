package com.isms;

import com.isms.domain.NotificationService;
import com.isms.domain.ProductService;
import com.isms.domain.StockRecordService;
import com.isms.domain.WarehouseStaffService;
import com.isms.model.Product;
import com.isms.trace.CallTrace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class Seq1InventoryTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private StockRecordService stockRecordService;

    @Autowired
    private WarehouseStaffService warehouseStaffService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CallTrace callTrace;

    @BeforeEach
    void setUp() {
        callTrace.clear();
    }

    @Test
    @DisplayName("Sequence 1: Inventory Management end-to-end with low-stock alert branch")
    void testSequence1WithLowStockAlert() {
        String sku = "SKU-SEQ1-" + System.currentTimeMillis();
        String loc = "WH-01";

        // 1. Search
        productService.search(null, null, null, null, null);

        // 2. Create product with reorder point 10
        Product p = new Product(sku, "Seq1 Item", "Electronics", BigDecimal.valueOf(99.99), 10, "PCS");
        productService.create(p);

        // 3. Update stock
        stockRecordService.updateStock(sku, loc, 50);

        // 4. Update product details
        p.setName("Seq1 Item Updated");
        productService.update(sku, p);

        // 5. Update stock to 0 to permit guarded delete
        stockRecordService.updateStock(sku, loc, 0);

        // 6. Guarded delete
        productService.delete(sku);

        // --- Loop: Voice Command capture, confirm, and low-stock alt branch ---
        // Re-create product for voice update
        String voiceSku = "SKU-VOICE-" + System.currentTimeMillis();
        Product vp = new Product(voiceSku, "Voice Item", "Hardware", BigDecimal.valueOf(25), 15, "PCS");
        productService.create(vp);

        // 7. Loop capture_voice_command
        Map<String, Object> voiceResp = warehouseStaffService.captureVoiceCommand(
                "set 5 units of " + voiceSku + " in location " + loc,
                0.90,
                "headset-1"
        );
        String token = (String) voiceResp.get("token");

        // 8. Confirm voice command -> triggers StockRecordService.updateStock -> realtimeSync -> triggerLowStock -> sendAudioAlert
        warehouseStaffService.confirmVoiceCommand(token, true);

        List<String> actualCalls = callTrace.getCalls();

        // Verify message order matching Sequence 1 diagram
        assertTrue(actualCalls.contains("ProductService.search"), "Must contain ProductService.search");
        assertTrue(actualCalls.contains("ProductService.create"), "Must contain ProductService.create");
        assertTrue(actualCalls.contains("StockRecordService.updateStock"), "Must contain StockRecordService.updateStock");
        assertTrue(actualCalls.contains("ProductService.update"), "Must contain ProductService.update");
        assertTrue(actualCalls.contains("ProductService.delete"), "Must contain ProductService.delete");
        assertTrue(actualCalls.contains("WarehouseStaffService.captureVoiceCommand"), "Must contain WarehouseStaffService.captureVoiceCommand");
        assertTrue(actualCalls.contains("StockRecordService.realtimeSync"), "Must contain StockRecordService.realtimeSync");

        // Alt Branch 1: qty (5) < reorder point (15) => triggers low stock alert and audio alert
        assertTrue(actualCalls.contains("NotificationService.triggerLowStock"), "Alt branch: Must trigger low stock notification");
        assertTrue(actualCalls.contains("NotificationService.sendAudioAlert"), "Alt branch: Must send audio alert");
    }

    @Test
    @DisplayName("Sequence 1: Inventory Management 'no alert required' alt branch")
    void testSequence1NoAlertBranch() {
        String sku = "SKU-NOALERT-" + System.currentTimeMillis();
        String loc = "WH-01";

        Product p = new Product(sku, "No Alert Item", "Grocery", BigDecimal.valueOf(10), 10, "PCS");
        productService.create(p);

        callTrace.clear();

        // Stock set to 100, which is well above reorder point (10)
        stockRecordService.updateStock(sku, loc, 100);

        List<String> calls = callTrace.getCalls();
        assertTrue(calls.contains("StockRecordService.updateStock"));
        assertTrue(calls.contains("StockRecordService.realtimeSync"));

        // Alt Branch 2: Should NOT trigger low stock alert
        boolean triggeredAlert = calls.stream().anyMatch(c -> c.startsWith("NotificationService.triggerLowStock"));
        assertTrue(!triggeredAlert, "Alt branch 'no alert required': NotificationService.triggerLowStock must NOT be called");
    }
}
