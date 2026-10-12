package com.isms.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.isms.config.AppProperties;
import com.isms.domain.SalesOrderService;
import com.isms.domain.SalesPersonnelService;
import com.isms.model.SalesOrder;
import com.isms.model.SalesOrderLineItem;
import com.isms.model.enums.SalesStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesController {

    private final SalesPersonnelService salesPersonnelService;
    private final SalesOrderService salesOrderService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public SalesController(
            SalesPersonnelService salesPersonnelService,
            SalesOrderService salesOrderService,
            AppProperties appProperties,
            ObjectMapper objectMapper
    ) {
        this.salesPersonnelService = salesPersonnelService;
        this.salesOrderService = salesOrderService;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    public record LogPhysicalSaleRequest(
            String location,
            String location_id,
            String customer_info,
            String customerInfo,
            List<Map<String, Object>> lines
    ) {}

    @PostMapping("/physical")
    @PreAuthorize("hasAnyRole('SALES_PERSONNEL', 'MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> logPhysicalSale(@RequestBody LogPhysicalSaleRequest request) {
        String userId = getCurrentUserId();
        String loc = request.location() != null ? request.location() : request.location_id();
        if (loc == null || loc.isBlank()) loc = "WH-01";
        String customer = request.customer_info() != null ? request.customer_info() : request.customerInfo();

        Map<String, Object> result = salesPersonnelService.logPhysicalSale(userId, loc, request.lines(), customer);
        return ResponseEntity.status(201).body(result);
    }

    @PostMapping(value = "/webhook/{marketplace}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> processWebhook(
            @PathVariable("marketplace") String marketplace,
            @RequestHeader(value = "X-Signature", required = false) String signature,
            @RequestBody byte[] rawBody
    ) {
        try {
            Map<String, Object> payload = objectMapper.readValue(rawBody, new TypeReference<Map<String, Object>>() {});
            Map<String, Object> result = salesOrderService.processWebhook(marketplace, signature, rawBody, payload);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            if (e instanceof com.isms.error.ApiException apiEx) {
                throw apiEx;
            }
            throw new com.isms.error.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", e.getMessage());
        }
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('SALES_PERSONNEL', 'MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> processReturn(@PathVariable("id") String id) {
        salesOrderService.processReturn(id);
        SalesOrder order = salesOrderService.getOrder(id);
        return ResponseEntity.ok(serializeOrderSummary(order));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SALES_PERSONNEL', 'MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<List<Map<String, Object>>> listOrders(
            @RequestParam(value = "channel", required = false) String channel,
            @RequestParam(value = "status", required = false) String statusStr,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to
    ) {
        SalesStatus status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            for (SalesStatus s : SalesStatus.values()) {
                if (s.getValue().equalsIgnoreCase(statusStr) || s.name().equalsIgnoreCase(statusStr)) {
                    status = s;
                    break;
                }
            }
        }

        List<SalesOrder> list = salesOrderService.listOrders(channel, status, from, to);
        List<Map<String, Object>> response = list.stream().map(o -> {
            Map<String, Object> m = serializeOrderSummary(o);
            // the list view shows the order total and size without a second request per row
            List<SalesOrderLineItem> items = salesOrderService.getLineItems(o.getOrderId());
            java.math.BigDecimal total = items.stream()
                    .map(i -> i.getUnitPrice().multiply(java.math.BigDecimal.valueOf(i.getQuantity())))
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            m.put("totalAmount", total);
            m.put("lineCount", items.size());
            return m;
        }).toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SALES_PERSONNEL', 'MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getOrderById(@PathVariable("id") String id) {
        SalesOrder order = salesOrderService.getOrder(id);
        List<SalesOrderLineItem> items = salesOrderService.getLineItems(id);

        Map<String, Object> response = serializeOrderSummary(order);
        List<Map<String, Object>> linesData = items.stream().map(item -> {
            Map<String, Object> map = new HashMap<>();
            map.put("skuId", item.getProduct().getSkuId());
            map.put("productName", item.getProduct().getName());
            map.put("locationId", item.getLocationId());
            map.put("quantity", item.getQuantity());
            map.put("unitPrice", item.getUnitPrice());
            map.put("lineTotal", item.getUnitPrice().multiply(java.math.BigDecimal.valueOf(item.getQuantity())));
            return map;
        }).toList();

        response.put("lines", linesData);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/invoice")
    @PreAuthorize("hasAnyRole('SALES_PERSONNEL', 'MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable("id") String id) {
        byte[] pdfBytes = salesOrderService.generateInvoice(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "invoice-" + id + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }

    @PostMapping("/dev/simulate-marketplace-order")
    public ResponseEntity<Map<String, Object>> simulateMarketplaceOrder(
            @RequestParam(value = "marketplace", defaultValue = "amazon") String marketplace,
            @RequestBody(required = false) Map<String, Object> customPayload
    ) {
        Map<String, Object> payload = (customPayload != null && !customPayload.isEmpty()) ? customPayload : Map.of(
                "order_id", "SIM-" + System.currentTimeMillis(),
                "event", "order-paid",
                "customer_info", "Simulated Buyer, Bengaluru",
                "lines", List.of(Map.of("sku_id", "SKU-TEST", "quantity", 1, "location_id", "WH-01"))
        );

        try {
            byte[] bodyBytes = objectMapper.writeValueAsBytes(payload);
            String secret = "secret1";
            if (appProperties.marketplaceSecrets() != null) {
                try {
                    Map<String, String> secMap = objectMapper.readValue(appProperties.marketplaceSecrets(), new TypeReference<Map<String, String>>() {});
                    if (secMap.containsKey(marketplace.toLowerCase())) {
                        secret = secMap.get(marketplace.toLowerCase());
                    }
                } catch (Exception ignored) {}
            }

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String sig = HexFormat.of().formatHex(mac.doFinal(bodyBytes));

            Map<String, Object> res = salesOrderService.processWebhook(marketplace, sig, bodyBytes, payload);
            return ResponseEntity.ok(Map.of("simulated", true, "signature", sig, "result", res));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getPrincipal() != null) ? auth.getPrincipal().toString() : "USR-SALES-1";
    }

    private Map<String, Object> serializeOrderSummary(SalesOrder order) {
        Map<String, Object> map = new HashMap<>();
        map.put("orderId", order.getOrderId());
        map.put("channel", order.getChannel());
        map.put("status", order.getStatus().getValue());
        map.put("customerInfo", order.getCustomerInfo());
        map.put("paymentReference", order.getPaymentReference());
        map.put("createdAt", order.getCreatedAt().toString());
        return map;
    }
}
