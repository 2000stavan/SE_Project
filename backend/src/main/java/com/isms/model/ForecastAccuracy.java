package com.isms.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;

@Entity
@Table(name = "forecast_accuracy")
public class ForecastAccuracy {

    @Id
    @Column(name = "accuracy_id", length = 48, nullable = false)
    private String accuracyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sku_id", nullable = false)
    private Product product;

    @Column(name = "forecast_period", length = 16, nullable = false)
    private String forecastPeriod;

    @Column(name = "predicted_demand", nullable = false)
    private Integer predictedDemand;

    @Column(name = "actual_demand", nullable = false)
    private Integer actualDemand = 0;

    @Column(name = "absolute_error", nullable = false)
    private Integer absoluteError = 0;

    @Column(name = "percentage_error", precision = 5, scale = 2, nullable = false)
    private BigDecimal percentageError = BigDecimal.ZERO;

    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt = OffsetDateTime.now();

    public ForecastAccuracy() {}

    public ForecastAccuracy(String accuracyId, Product product, String forecastPeriod, Integer predictedDemand, Integer actualDemand, Integer absoluteError, BigDecimal percentageError, OffsetDateTime recordedAt) {
        this.accuracyId = accuracyId;
        this.product = product;
        this.forecastPeriod = forecastPeriod;
        this.predictedDemand = predictedDemand;
        this.actualDemand = actualDemand != null ? actualDemand : 0;
        this.absoluteError = absoluteError != null ? absoluteError : 0;
        this.percentageError = percentageError != null ? percentageError : BigDecimal.ZERO;
        this.recordedAt = recordedAt != null ? recordedAt : OffsetDateTime.now();
    }

    public String getAccuracyId() {
        return accuracyId;
    }

    public void setAccuracyId(String accuracyId) {
        this.accuracyId = accuracyId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getForecastPeriod() {
        return forecastPeriod;
    }

    public void setForecastPeriod(String forecastPeriod) {
        this.forecastPeriod = forecastPeriod;
    }

    public Integer getPredictedDemand() {
        return predictedDemand;
    }

    public void setPredictedDemand(Integer predictedDemand) {
        this.predictedDemand = predictedDemand;
    }

    public Integer getActualDemand() {
        return actualDemand;
    }

    public void setActualDemand(Integer actualDemand) {
        this.actualDemand = actualDemand;
    }

    public Integer getAbsoluteError() {
        return absoluteError;
    }

    public void setAbsoluteError(Integer absoluteError) {
        this.absoluteError = absoluteError;
    }

    public BigDecimal getPercentageError() {
        return percentageError;
    }

    public void setPercentageError(BigDecimal percentageError) {
        this.percentageError = percentageError;
    }

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(OffsetDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ForecastAccuracy that)) return false;
        return Objects.equals(accuracyId, that.accuracyId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(accuracyId);
    }
}
