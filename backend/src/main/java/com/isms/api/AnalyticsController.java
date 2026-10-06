package com.isms.api;

import com.isms.domain.ForecastService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/analytics", "/analytics"})
public class AnalyticsController {

    private final ForecastService forecastService;

    public AnalyticsController(ForecastService forecastService) {
        this.forecastService = forecastService;
    }

    /**
     * GET /analytics/revenue?group_by=channel|location|period&from=&to=
     * Roles: Administrator, Manager
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getRevenueAnalytics(
            @RequestParam(name = "group_by", defaultValue = "channel") String groupBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        OffsetDateTime fromDt = from != null ? from.atStartOfDay().atOffset(ZoneOffset.UTC) : null;
        OffsetDateTime toDt = to != null ? to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC) : null;

        Map<String, Object> data = forecastService.getRevenueAnalytics(groupBy, fromDt, toDt);
        return ResponseEntity.ok(Map.of("data", data));
    }

    /**
     * GET /analytics/stock
     * Roles: Administrator, Manager, Warehouse Staff
     */
    @GetMapping("/stock")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<Map<String, Object>> getStockAnalytics() {
        Map<String, Object> data = forecastService.getStockAnalytics();
        return ResponseEntity.ok(Map.of("data", data));
    }
}
