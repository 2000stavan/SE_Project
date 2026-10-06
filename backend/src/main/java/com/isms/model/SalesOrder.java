package com.isms.model;

import com.isms.model.enums.SalesStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "sales_orders")
public class SalesOrder {

    @Id
    @Column(name = "order_id", length = 48, nullable = false)
    private String orderId;

    @Column(name = "channel", length = 40, nullable = false)
    private String channel;

    @Column(name = "customer_info", columnDefinition = "TEXT", nullable = false)
    private String customerInfo = "";

    @Column(name = "status", length = 12, nullable = false)
    private SalesStatus status = SalesStatus.PENDING;

    @Column(name = "payment_reference", length = 80)
    private String paymentReference;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SalesOrderLineItem> lineItems = new ArrayList<>();

    public SalesOrder() {}

    public SalesOrder(String orderId, String channel, String customerInfo, SalesStatus status, String paymentReference, OffsetDateTime createdAt) {
        this.orderId = orderId;
        this.channel = channel;
        this.customerInfo = customerInfo != null ? customerInfo : "";
        this.status = status != null ? status : SalesStatus.PENDING;
        this.paymentReference = paymentReference;
        this.createdAt = createdAt != null ? createdAt : OffsetDateTime.now();
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getCustomerInfo() {
        return customerInfo;
    }

    public void setCustomerInfo(String customerInfo) {
        this.customerInfo = customerInfo;
    }

    public SalesStatus getStatus() {
        return status;
    }

    public void setStatus(SalesStatus status) {
        this.status = status;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<SalesOrderLineItem> getLineItems() {
        return lineItems;
    }

    public void setLineItems(List<SalesOrderLineItem> lineItems) {
        this.lineItems = lineItems;
    }

    public void addLineItem(SalesOrderLineItem item) {
        lineItems.add(item);
        item.setSalesOrder(this);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SalesOrder that)) return false;
        return Objects.equals(orderId, that.orderId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderId);
    }
}
