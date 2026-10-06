package com.isms.domain;

import com.isms.error.ApiException;
import com.isms.model.SalesOrder;
import com.isms.model.enums.SalesStatus;
import com.isms.repository.SalesOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;

    public SalesOrderService(SalesOrderRepository salesOrderRepository) {
        this.salesOrderRepository = salesOrderRepository;
    }

    public Map<String, Object> createOrder(String channel, String customerInfo, List<Map<String, Object>> lines) {
        String orderId = "ORD-" + System.currentTimeMillis();
        SalesOrder order = new SalesOrder(orderId, channel, customerInfo, SalesStatus.PENDING, null, OffsetDateTime.now());
        SalesOrder saved = salesOrderRepository.save(order);
        return Map.of("orderId", saved.getOrderId(), "status", saved.getStatus().getValue());
    }

    public Map<String, Object> processWebhook(String marketplace, String signature, Map<String, Object> payload) {
        return Map.of("status", "processed", "marketplace", marketplace);
    }

    public void processReturn(String orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found"));
        order.setStatus(SalesStatus.RETURNED);
        salesOrderRepository.save(order);
    }

    public byte[] generateInvoice(String orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found"));
        // Returns minimal PDF bytes (extended with OpenPDF in P4)
        return ("INVOICE FOR " + order.getOrderId()).getBytes();
    }
}
