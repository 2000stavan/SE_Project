package com.isms.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class AuditLogger {

    private static final Logger log = LoggerFactory.getLogger(AuditLogger.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentLinkedDeque<Map<String, Object>> logBuffer = new ConcurrentLinkedDeque<>();
    private static final int MAX_BUFFER_SIZE = 1000;

    public void log(String userId, String action, String resource, Map<String, Object> details) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", UUID.randomUUID().toString());
        entry.put("timestamp", Instant.now().toString());
        entry.put("user_id", userId != null ? userId : "anonymous");
        entry.put("action", action);
        entry.put("resource", resource);
        if (details != null && !details.isEmpty()) {
            entry.put("details", new LinkedHashMap<>(details));
        } else {
            entry.put("details", Collections.emptyMap());
        }

        logBuffer.addFirst(entry);
        while (logBuffer.size() > MAX_BUFFER_SIZE) {
            logBuffer.pollLast();
        }

        try {
            String json = objectMapper.writeValueAsString(entry);
            log.info("[AUDIT] {}", json);
        } catch (JsonProcessingException e) {
            log.info("[AUDIT] user={} action={} resource={}", userId, action, resource);
        }
    }

    public void logStockChange(String userId, String skuId, String locationId, int oldQty, int newQty, String reason) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("sku_id", skuId);
        details.put("location_id", locationId);
        details.put("old_quantity", oldQty);
        details.put("new_quantity", newQty);
        details.put("delta", newQty - oldQty);
        if (reason != null) details.put("reason", reason);
        log(userId, "STOCK_CHANGE", "stock_records", details);
    }

    public void logPoEvent(String userId, String poId, String action, Map<String, Object> details) {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("po_id", poId);
        if (details != null) d.putAll(details);
        log(userId, action, "purchase_orders", d);
    }

    public void logSaleEvent(String userId, String orderId, String action, Map<String, Object> details) {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("order_id", orderId);
        if (details != null) d.putAll(details);
        log(userId, action, "sales_orders", d);
    }

    public List<Map<String, Object>> getRecentLogs(String actionFilter, String resourceFilter, String userFilter) {
        return logBuffer.stream()
                .filter(entry -> {
                    if (actionFilter != null && !actionFilter.isBlank() && !actionFilter.equalsIgnoreCase((String) entry.get("action"))) {
                        return false;
                    }
                    if (resourceFilter != null && !resourceFilter.isBlank() && !resourceFilter.equalsIgnoreCase((String) entry.get("resource"))) {
                        return false;
                    }
                    if (userFilter != null && !userFilter.isBlank() && !userFilter.equalsIgnoreCase((String) entry.get("user_id"))) {
                        return false;
                    }
                    return true;
                })
                .toList();
    }
}
