package com.isms.repository;

import com.isms.model.ForecastAccuracy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForecastAccuracyRepository extends JpaRepository<ForecastAccuracy, String> {
    List<ForecastAccuracy> findByProductSkuIdOrderByForecastPeriodDesc(String skuId);
    List<ForecastAccuracy> findAllByOrderByRecordedAtDesc();
    Optional<ForecastAccuracy> findByProductSkuIdAndForecastPeriod(String skuId, String forecastPeriod);
}
