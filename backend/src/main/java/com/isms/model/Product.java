package com.isms.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @Column(name = "sku_id", length = 32, nullable = false)
    private String skuId;

    @Column(name = "name", length = 160, nullable = false)
    private String name;

    @Column(name = "category", length = 80, nullable = false)
    private String category;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "reorder_point", nullable = false)
    private Integer reorderPoint = 0;

    @Column(name = "unit_of_measure", length = 20, nullable = false)
    private String unitOfMeasure;

    public Product() {}

    public Product(String skuId, String name, String category, BigDecimal unitPrice, Integer reorderPoint, String unitOfMeasure) {
        this.skuId = skuId;
        this.name = name;
        this.category = category;
        this.unitPrice = unitPrice;
        this.reorderPoint = reorderPoint != null ? reorderPoint : 0;
        this.unitOfMeasure = unitOfMeasure;
    }

    public String getSkuId() {
        return skuId;
    }

    public void setSkuId(String skuId) {
        this.skuId = skuId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Integer getReorderPoint() {
        return reorderPoint;
    }

    public void setReorderPoint(Integer reorderPoint) {
        this.reorderPoint = reorderPoint;
    }

    public String getUnitOfMeasure() {
        return unitOfMeasure;
    }

    public void setUnitOfMeasure(String unitOfMeasure) {
        this.unitOfMeasure = unitOfMeasure;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Product product)) return false;
        return Objects.equals(skuId, product.skuId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(skuId);
    }
}
