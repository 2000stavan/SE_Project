package com.isms.api;

import com.isms.domain.ForecastService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/forecast", "/forecast"})
public class ForecastController {

    private final ForecastService forecastService;

    public ForecastController(ForecastService forecastService) {
        this.forecastService = forecastService;
    }

    /**
     * POST /forecast/run
     * Roles: Administrator, Manager
     * Calls Forecast.generate_demand() -> detect_seasonality() -> recommend_reorder()
     */
    @PostMapping("/run")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> runForecast(
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String location) {

        String skuId = sku != null ? sku : (body != null ? body.get("sku_id") : null);
        String locationId = location != null ? location : (body != null ? body.get("location_id") : null);

        if (skuId != null && !skuId.isBlank()) {
            Map<String, Object> result = forecastService.runPipeline(skuId, locationId);
            return ResponseEntity.ok(Map.of("status", "success", "data", result));
        }

        List<Map<String, Object>> allResults = forecastService.runAllForecasts();
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "processed_items", allResults.size(),
                "data", allResults
        ));
    }

    /**
     * GET /forecast?sku=&location=
     * Roles: Administrator, Manager
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getForecasts(
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String location) {
        List<Map<String, Object>> forecasts = forecastService.getForecasts(sku, location);
        return ResponseEntity.ok(Map.of("data", forecasts));
    }

    /**
     * GET /forecast/reorder-suggestions
     * Roles: Manager, Administrator
     * SKUs near reorder point with pre-filled PO draft payload.
     */
    @GetMapping("/reorder-suggestions")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> getReorderSuggestions() {
        List<Map<String, Object>> suggestions = forecastService.getReorderSuggestions();
        return ResponseEntity.ok(Map.of("data", suggestions));
    }
}
