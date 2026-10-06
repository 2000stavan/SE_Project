package com.isms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ForecastId implements Serializable {

    @Column(name = "sku_id", length = 32, nullable = false)
    private String skuId;

    @Column(name = "location_id", length = 32, nullable = false)
    private String locationId;

    @Column(name = "forecast_period", length = 16, nullable = false)
    private String forecastPeriod;

    public ForecastId() {}

    public ForecastId(String skuId, String locationId, String forecastPeriod) {
        this.skuId = skuId;
        this.locationId = locationId;
        this.forecastPeriod = forecastPeriod;
    }

    public String getSkuId() {
        return skuId;
    }

    public void setSkuId(String skuId) {
        this.skuId = skuId;
    }

    public String getLocationId() {
        return locationId;
    }

    public void setLocationId(String locationId) {
        this.locationId = locationId;
    }

    public String getForecastPeriod() {
        return forecastPeriod;
    }

    public void setForecastPeriod(String forecastPeriod) {
        this.forecastPeriod = forecastPeriod;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ForecastId that)) return false;
        return Objects.equals(skuId, that.skuId) &&
               Objects.equals(locationId, that.locationId) &&
               Objects.equals(forecastPeriod, that.forecastPeriod);
    }

    @Override
    public int hashCode() {
        return Objects.hash(skuId, locationId, forecastPeriod);
    }
}
