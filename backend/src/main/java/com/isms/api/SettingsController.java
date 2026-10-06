package com.isms.api;

import com.isms.config.AppProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/settings", "/settings"})
public class SettingsController {

    private final AppProperties appProperties;

    public SettingsController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * E2.4: System settings screen read-only (shows approval limit, thresholds from env)
     * Roles: Administrator, Manager
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getSystemSettings() {
        return ResponseEntity.ok(Map.of(
                "approval_limit_manager", appProperties.limits() != null ? appProperties.limits().approvalLimitManager() : 50000.00,
                "supplier_credit_limit", appProperties.limits() != null ? appProperties.limits().supplierCreditLimit() : 100000.00,
                "max_failed_attempts", appProperties.auth() != null ? appProperties.auth().maxFailedAttempts() : 5,
                "lockout_window_minutes", appProperties.auth() != null ? appProperties.auth().failWindowMinutes() : 15,
                "session_idle_minutes", appProperties.jwt() != null ? appProperties.jwt().idleMinutes() : 30,
                "voice_confidence_threshold", appProperties.voice() != null ? appProperties.voice().confidenceThreshold() : 0.8,
                "audio_alert_max_volume", appProperties.audioAlertMaxVolume() != null ? appProperties.audioAlertMaxVolume() : 0.8,
                "storage_directory", appProperties.storageDir() != null ? appProperties.storageDir() : "storage",
                "tax_rate", appProperties.taxRate() != null ? appProperties.taxRate() : 0.08
        ));
    }
}
