package com.isms.model;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "forecasts")
public class Forecast {

    @EmbeddedId
    private ForecastId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skuId")
    @JoinColumn(name = "sku_id", nullable = false)
    private Product product;

    @Column(name = "predicted_demand", nullable = false)
    private Integer predictedDemand;

    @Column(name = "recommended_reorder_qty", nullable = false)
    private Integer recommendedReorderQty;

    public Forecast() {}

    public Forecast(ForecastId id, Product product, Integer predictedDemand, Integer recommendedReorderQty) {
        this.id = id;
        this.product = product;
        this.predictedDemand = predictedDemand;
        this.recommendedReorderQty = recommendedReorderQty;
    }

    public ForecastId getId() {
        return id;
    }

    public void setId(ForecastId id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getPredictedDemand() {
        return predictedDemand;
    }

    public void setPredictedDemand(Integer predictedDemand) {
        this.predictedDemand = predictedDemand;
    }

    public Integer getRecommendedReorderQty() {
        return recommendedReorderQty;
    }

    public void setRecommendedReorderQty(Integer recommendedReorderQty) {
        this.recommendedReorderQty = recommendedReorderQty;
    }

    public String getSkuId() {
        return id != null ? id.getSkuId() : null;
    }

    public String getLocationId() {
        return id != null ? id.getLocationId() : null;
    }

    public String getForecastPeriod() {
        return id != null ? id.getForecastPeriod() : null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Forecast that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
