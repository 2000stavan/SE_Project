package com.isms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;

@ConfigurationProperties(prefix = "isms")
public record AppProperties(
        Jwt jwt,
        Auth auth,
        Voice voice,
        Limits limits,
        BigDecimal taxRate,
        Double audioAlertMaxVolume,
        String marketplaceSecrets,
        String storageDir
) {
    public record Jwt(
            String secret,
            int idleMinutes
    ) {}

    public record Auth(
            int maxFailedAttempts,
            int failWindowMinutes
    ) {}

    public record Voice(
            double confidenceThreshold
    ) {}

    public record Limits(
            BigDecimal approvalLimitManager,
            BigDecimal supplierCreditLimit
    ) {}
}
