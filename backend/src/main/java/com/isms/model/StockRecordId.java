package com.isms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class StockRecordId implements Serializable {

    @Column(name = "sku_id", length = 32, nullable = false)
    private String skuId;

    @Column(name = "location_id", length = 32, nullable = false)
    private String locationId;

    public StockRecordId() {}

    public StockRecordId(String skuId, String locationId) {
        this.skuId = skuId;
        this.locationId = locationId;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StockRecordId that)) return false;
        return Objects.equals(skuId, that.skuId) && Objects.equals(locationId, that.locationId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(skuId, locationId);
    }
}
