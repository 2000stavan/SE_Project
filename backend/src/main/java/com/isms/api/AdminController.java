package com.isms.api;

import com.isms.audit.AuditLogger;
import com.isms.config.AppProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class AdminController {

    private final AuditLogger auditLogger;
    private final AppProperties appProperties;

    public AdminController(AuditLogger auditLogger, AppProperties appProperties) {
        this.auditLogger = auditLogger;
        this.appProperties = appProperties;
    }

    @GetMapping("/audit-log")
    public ResponseEntity<List<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) String user
    ) {
        List<Map<String, Object>> logs = auditLogger.getRecentLogs(action, resource, user);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(Map.of(
                "approvalLimitManager", appProperties.limits() != null && appProperties.limits().approvalLimitManager() != null
                        ? appProperties.limits().approvalLimitManager() : 100000,
                "supplierCreditLimit", appProperties.limits() != null && appProperties.limits().supplierCreditLimit() != null
                        ? appProperties.limits().supplierCreditLimit() : 500000,
                "taxRate", appProperties.taxRate() != null ? appProperties.taxRate() : 0.18,
                "audioAlertMaxVolume", appProperties.audioAlertMaxVolume() != null ? appProperties.audioAlertMaxVolume() : 0.60
        ));
    }
}
