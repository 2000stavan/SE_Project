package com.isms.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AuditLogger {

    private static final Logger log = LoggerFactory.getLogger(AuditLogger.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void log(String userId, String action, String resource, Map<String, Object> details) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("timestamp", Instant.now().toString());
        entry.put("user_id", userId != null ? userId : "anonymous");
        entry.put("action", action);
        entry.put("resource", resource);
        if (details != null && !details.isEmpty()) {
            entry.put("details", details);
        }

        try {
            String json = objectMapper.writeValueAsString(entry);
            log.info("[AUDIT] {}", json);
        } catch (JsonProcessingException e) {
            log.info("[AUDIT] user={} action={} resource={}", userId, action, resource);
        }
    }
}
