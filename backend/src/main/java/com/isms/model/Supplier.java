package com.isms.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(name = "suppliers")
public class Supplier {

    @Id
    @Column(name = "supplier_id", length = 32, nullable = false)
    private String supplierId;

    @Column(name = "name", length = 160, nullable = false)
    private String name;

    @Column(name = "contact_details", columnDefinition = "TEXT", nullable = false)
    private String contactDetails;

    @Column(name = "rating", precision = 3, scale = 2, nullable = false)
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "lead_time", nullable = false)
    private Integer leadTime = 0;

    @Column(name = "procurement_history", columnDefinition = "TEXT", nullable = false)
    private String procurementHistory = "";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public Supplier() {}

    public Supplier(String supplierId, String name, String contactDetails, BigDecimal rating, Integer leadTime, String procurementHistory, Boolean isActive) {
        this.supplierId = supplierId;
        this.name = name;
        this.contactDetails = contactDetails;
        this.rating = rating != null ? rating : BigDecimal.ZERO;
        this.leadTime = leadTime != null ? leadTime : 0;
        this.procurementHistory = procurementHistory != null ? procurementHistory : "";
        this.isActive = isActive != null ? isActive : true;
    }

    public String getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(String supplierId) {
        this.supplierId = supplierId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContactDetails() {
        return contactDetails;
    }

    public void setContactDetails(String contactDetails) {
        this.contactDetails = contactDetails;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public void setRating(BigDecimal rating) {
        this.rating = rating;
    }

    public Integer getLeadTime() {
        return leadTime;
    }

    public void setLeadTime(Integer leadTime) {
        this.leadTime = leadTime;
    }

    public String getProcurementHistory() {
        return procurementHistory;
    }

    public void setProcurementHistory(String procurementHistory) {
        this.procurementHistory = procurementHistory;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Supplier supplier)) return false;
        return Objects.equals(supplierId, supplier.supplierId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(supplierId);
    }
}
