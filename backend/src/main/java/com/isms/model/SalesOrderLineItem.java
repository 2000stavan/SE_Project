package com.isms.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(name = "sales_order_line_items")
public class SalesOrderLineItem {

    @EmbeddedId
    private SalesOrderLineItemId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("orderId")
    @JoinColumn(name = "order_id", nullable = false)
    private SalesOrder salesOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skuId")
    @JoinColumn(name = "sku_id", nullable = false)
    private Product product;

    @Column(name = "location_id", length = 32, nullable = false)
    private String locationId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    public SalesOrderLineItem() {}

    public SalesOrderLineItem(SalesOrderLineItemId id, SalesOrder salesOrder, Product product, String locationId, Integer quantity, BigDecimal unitPrice) {
        this.id = id;
        this.salesOrder = salesOrder;
        this.product = product;
        this.locationId = locationId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }

    public SalesOrderLineItemId getId() {
        return id;
    }

    public void setId(SalesOrderLineItemId id) {
        this.id = id;
    }

    public SalesOrder getSalesOrder() {
        return salesOrder;
    }

    public void setSalesOrder(SalesOrder salesOrder) {
        this.salesOrder = salesOrder;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getLocationId() {
        return locationId;
    }

    public void setLocationId(String locationId) {
        this.locationId = locationId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getOrderId() {
        return id != null ? id.getOrderId() : null;
    }

    public String getSkuId() {
        return id != null ? id.getSkuId() : null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SalesOrderLineItem that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
