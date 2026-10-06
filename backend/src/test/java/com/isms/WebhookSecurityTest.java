package com.isms;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.isms.domain.ProductService;
import com.isms.domain.StockRecordService;
import com.isms.model.Product;
import com.isms.model.StockRecord;
import com.isms.repository.StockRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WebhookSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductService productService;

    @Autowired
    private StockRecordService stockRecordService;

    @Autowired
    private StockRecordRepository stockRecordRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Webhook Security: Valid HMAC signature is accepted (200 OK)")
    void testValidHmacSignatureAccepted() throws Exception {
        String sku = "SKU-HMAC-OK-" + System.currentTimeMillis();
        String loc = "WH-01";
        productService.create(new Product(sku, "Security Item", "General", BigDecimal.valueOf(100), 5, "PCS"));
        stockRecordService.updateStock(sku, loc, 30);

        String orderId = "AMZ-SEC-" + System.currentTimeMillis();
        Map<String, Object> payload = Map.of(
                "order_id", orderId,
                "event", "order-paid",
                "customer_info", "Verified Buyer",
                "lines", List.of(Map.of("sku_id", sku, "quantity", 2, "location_id", loc))
        );

        byte[] rawBytes = objectMapper.writeValueAsBytes(payload);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret1".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = HexFormat.of().formatHex(mac.doFinal(rawBytes));

        mockMvc.perform(post("/api/v1/sales/webhook/amazon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Signature", sig)
                        .content(rawBytes))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("processed"));

        // Verify stock deducted
        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(28, stock.getQuantityOnHand());
    }

    @Test
    @DisplayName("Webhook Security: Invalid HMAC signature is rejected with 401 Unauthorized")
    void testInvalidHmacSignatureRejected() throws Exception {
        Map<String, Object> payload = Map.of(
                "order_id", "AMZ-FAKE-123",
                "event", "order-paid"
        );
        byte[] rawBytes = objectMapper.writeValueAsBytes(payload);

        mockMvc.perform(post("/api/v1/sales/webhook/amazon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Signature", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff")
                        .content(rawBytes))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Webhook Security: Missing X-Signature header is rejected with 401 Unauthorized")
    void testMissingHmacSignatureRejected() throws Exception {
        Map<String, Object> payload = Map.of(
                "order_id", "AMZ-NOSIG-123",
                "event", "order-paid"
        );
        byte[] rawBytes = objectMapper.writeValueAsBytes(payload);

        mockMvc.perform(post("/api/v1/sales/webhook/amazon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rawBytes))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Webhook Idempotency: Replaying the same order event is idempotent without double deduction")
    void testReplayEventIsIdempotent() throws Exception {
        String sku = "SKU-IDEMP-" + System.currentTimeMillis();
        String loc = "WH-01";
        productService.create(new Product(sku, "Idempotent Item", "General", BigDecimal.valueOf(50), 5, "PCS"));
        stockRecordService.updateStock(sku, loc, 20);

        String orderId = "AMZ-IDEMP-" + System.currentTimeMillis();
        Map<String, Object> payload = Map.of(
                "order_id", orderId,
                "event", "order-paid",
                "customer_info", "Idempotent Buyer",
                "lines", List.of(Map.of("sku_id", sku, "quantity", 5, "location_id", loc))
        );

        byte[] rawBytes = objectMapper.writeValueAsBytes(payload);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("secret1".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sig = HexFormat.of().formatHex(mac.doFinal(rawBytes));

        // First call: succeeds and deducts 5
        mockMvc.perform(post("/api/v1/sales/webhook/amazon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Signature", sig)
                        .content(rawBytes))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("processed"));

        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(15, stock.getQuantityOnHand());

        // Second call (replay): must be idempotent and not deduct again!
        mockMvc.perform(post("/api/v1/sales/webhook/amazon")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Signature", sig)
                        .content(rawBytes))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("idempotent_ok"));

        StockRecord stockAfterReplay = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, loc).orElseThrow();
        assertEquals(15, stockAfterReplay.getQuantityOnHand(), "Replay must NOT double-deduct stock");
    }
}
