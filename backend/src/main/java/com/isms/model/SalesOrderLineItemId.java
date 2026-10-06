package com.isms.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class SalesOrderLineItemId implements Serializable {

    @Column(name = "order_id", length = 48, nullable = false)
    private String orderId;

    @Column(name = "sku_id", length = 32, nullable = false)
    private String skuId;

    public SalesOrderLineItemId() {}

    public SalesOrderLineItemId(String orderId, String skuId) {
        this.orderId = orderId;
        this.skuId = skuId;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
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
        if (!(o instanceof SalesOrderLineItemId that)) return false;
        return Objects.equals(orderId, that.orderId) && Objects.equals(skuId, that.skuId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId, skuId);
    }
}
