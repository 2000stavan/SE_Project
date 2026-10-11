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

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber = 1;

    public SalesOrderLineItemId() {}

    public SalesOrderLineItemId(String orderId, String skuId) {
        this.orderId = orderId;
        this.skuId = skuId;
        this.lineNumber = 1;
    }

    public SalesOrderLineItemId(String orderId, String skuId, Integer lineNumber) {
        this.orderId = orderId;
        this.skuId = skuId;
        this.lineNumber = lineNumber != null ? lineNumber : 1;
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

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SalesOrderLineItemId that)) return false;
        return Objects.equals(orderId, that.orderId) &&
               Objects.equals(skuId, that.skuId) &&
               Objects.equals(lineNumber, that.lineNumber);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId, skuId, lineNumber);
    }
}
