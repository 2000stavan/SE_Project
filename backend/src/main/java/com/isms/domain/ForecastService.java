package com.isms.domain;

import com.isms.model.Forecast;
import com.isms.repository.ForecastRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@Transactional
public class ForecastService {

    private final ForecastRepository forecastRepository;

    public ForecastService(ForecastRepository forecastRepository) {
        this.forecastRepository = forecastRepository;
    }

    public Forecast generateDemand(String skuId, String locationId) {
        // Handled in P5 (in-process Holt-Winters)
        return null;
    }

    public Map<String, Object> detectSeasonality(String skuId, String locationId) {
        return Map.of("seasonality", "weekly", "cycle", 7);
    }

    public Map<String, Object> recommendReorder(String skuId, String locationId) {
        return Map.of("skuId", skuId, "locationId", locationId, "recommendedQty", 50);
    }
}
