package com.isms.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Objects;

@Entity
@Table(name = "po_line_items")
public class PoLineItem {

    @EmbeddedId
    private PoLineItemId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("poId")
    @JoinColumn(name = "po_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skuId")
    @JoinColumn(name = "sku_id", nullable = false)
    private Product product;

    @Column(name = "quantity_ordered", nullable = false)
    private Integer quantityOrdered;

    @Column(name = "quantity_received", nullable = false)
    private Integer quantityReceived = 0;

    @Column(name = "last_received_at")
    private OffsetDateTime lastReceivedAt;

    public PoLineItem() {}

    public PoLineItem(PoLineItemId id, PurchaseOrder purchaseOrder, Product product, Integer quantityOrdered, Integer quantityReceived, OffsetDateTime lastReceivedAt) {
        this.id = id;
        this.purchaseOrder = purchaseOrder;
        this.product = product;
        this.quantityOrdered = quantityOrdered;
        this.quantityReceived = quantityReceived != null ? quantityReceived : 0;
        this.lastReceivedAt = lastReceivedAt;
    }

    public PoLineItemId getId() {
        return id;
    }

    public void setId(PoLineItemId id) {
        this.id = id;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getQuantityOrdered() {
        return quantityOrdered;
    }

    public void setQuantityOrdered(Integer quantityOrdered) {
        this.quantityOrdered = quantityOrdered;
    }

    public Integer getQuantityReceived() {
        return quantityReceived;
    }

    public void setQuantityReceived(Integer quantityReceived) {
        this.quantityReceived = quantityReceived;
    }

    public OffsetDateTime getLastReceivedAt() {
        return lastReceivedAt;
    }

    public void setLastReceivedAt(OffsetDateTime lastReceivedAt) {
        this.lastReceivedAt = lastReceivedAt;
    }

    public String getPoId() {
        return id != null ? id.getPoId() : null;
    }

    public String getSkuId() {
        return id != null ? id.getSkuId() : null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PoLineItem that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
