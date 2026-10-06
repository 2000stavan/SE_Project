package com.isms.repository;

import com.isms.model.Forecast;
import com.isms.model.ForecastId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForecastRepository extends JpaRepository<Forecast, ForecastId> {
    List<Forecast> findByIdSkuId(String skuId);
    List<Forecast> findByIdSkuIdAndIdLocationId(String skuId, String locationId);
    List<Forecast> findByIdLocationId(String locationId);
}
