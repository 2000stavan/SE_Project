package com.isms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class PoLineItemId implements Serializable {

    @Column(name = "po_id", length = 32, nullable = false)
    private String poId;

    @Column(name = "sku_id", length = 32, nullable = false)
    private String skuId;

    public PoLineItemId() {}

    public PoLineItemId(String poId, String skuId) {
        this.poId = poId;
        this.skuId = skuId;
    }

    public String getPoId() {
        return poId;
    }

    public void setPoId(String poId) {
        this.poId = poId;
    }

    public String getSkuId() {
        return skuId;
    }

    public void setSkuId(String skuId) {
        this.skuId = skuId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PoLineItemId that)) return false;
        return Objects.equals(poId, that.poId) && Objects.equals(skuId, that.skuId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(poId, skuId);
    }
}
