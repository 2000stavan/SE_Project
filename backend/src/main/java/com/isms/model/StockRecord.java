package com.isms.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Objects;

@Entity
@Table(name = "stock_records")
public class StockRecord {

    @EmbeddedId
    private StockRecordId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skuId")
    @JoinColumn(name = "sku_id", nullable = false)
    private Product product;

    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Column(name = "quantity_reserved", nullable = false)
    private Integer quantityReserved = 0;

    @Column(name = "last_updated", nullable = false)
    private OffsetDateTime lastUpdated = OffsetDateTime.now();

    public StockRecord() {}

    public StockRecord(StockRecordId id, Product product, Integer quantityOnHand, Integer quantityReserved, OffsetDateTime lastUpdated) {
        this.id = id;
        this.product = product;
        this.quantityOnHand = quantityOnHand != null ? quantityOnHand : 0;
        this.quantityReserved = quantityReserved != null ? quantityReserved : 0;
        this.lastUpdated = lastUpdated != null ? lastUpdated : OffsetDateTime.now();
    }

    public StockRecordId getId() {
        return id;
    }

    public void setId(StockRecordId id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getQuantityOnHand() {
        return quantityOnHand;
    }

    public void setQuantityOnHand(Integer quantityOnHand) {
        this.quantityOnHand = quantityOnHand;
    }

    public Integer getQuantityReserved() {
        return quantityReserved;
    }

    public void setQuantityReserved(Integer quantityReserved) {
        this.quantityReserved = quantityReserved;
    }

    public OffsetDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(OffsetDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public String getSkuId() {
        return id != null ? id.getSkuId() : null;
    }

    public String getLocationId() {
        return id != null ? id.getLocationId() : null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StockRecord that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
