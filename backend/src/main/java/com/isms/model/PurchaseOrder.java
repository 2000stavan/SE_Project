package com.isms.model;

import com.isms.model.enums.PoStatus;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {

    @Id
    @Column(name = "po_id", length = 32, nullable = false)
    private String poId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "status", length = 20, nullable = false)
    private PoStatus status = PoStatus.DRAFT;

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate = LocalDate.now();

    @Column(name = "expected_date", nullable = false)
    private LocalDate expectedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_staff_id")
    private User warehouseStaff;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PoLineItem> lineItems = new ArrayList<>();

    public PurchaseOrder() {}

    public PurchaseOrder(String poId, Supplier supplier, PoStatus status, LocalDate orderDate, LocalDate expectedDate, User manager, User warehouseStaff) {
        this.poId = poId;
        this.supplier = supplier;
        this.status = status != null ? status : PoStatus.DRAFT;
        this.orderDate = orderDate != null ? orderDate : LocalDate.now();
        this.expectedDate = expectedDate;
        this.manager = manager;
        this.warehouseStaff = warehouseStaff;
    }

    public String getPoId() {
        return poId;
    }

    public void setPoId(String poId) {
        this.poId = poId;
    }

    public Supplier getSupplier() {
        return supplier;
    }

    public void setSupplier(Supplier supplier) {
        this.supplier = supplier;
    }

    public PoStatus getStatus() {
        return status;
    }

    public void setStatus(PoStatus status) {
        this.status = status;
    }

    public LocalDate getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDate orderDate) {
        this.orderDate = orderDate;
    }

    public LocalDate getExpectedDate() {
        return expectedDate;
    }

    public void setExpectedDate(LocalDate expectedDate) {
        this.expectedDate = expectedDate;
    }

    public User getManager() {
        return manager;
    }

    public void setManager(User manager) {
        this.manager = manager;
    }

    public User getWarehouseStaff() {
        return warehouseStaff;
    }

    public void setWarehouseStaff(User warehouseStaff) {
        this.warehouseStaff = warehouseStaff;
    }

    public List<PoLineItem> getLineItems() {
        return lineItems;
    }

    public void setLineItems(List<PoLineItem> lineItems) {
        this.lineItems = lineItems;
    }

    public void addLineItem(PoLineItem item) {
        lineItems.add(item);
        item.setPurchaseOrder(this);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PurchaseOrder that)) return false;
        return Objects.equals(poId, that.poId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(poId);
    }
}
