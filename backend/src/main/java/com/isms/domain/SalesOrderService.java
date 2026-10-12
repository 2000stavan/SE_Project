package com.isms.domain;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.isms.audit.AuditLogger;
import com.isms.config.AppProperties;
import com.isms.error.ApiException;
import com.isms.model.*;
import com.isms.model.enums.SalesStatus;
import com.isms.repository.ProductRepository;
import com.isms.repository.SalesOrderLineItemRepository;
import com.isms.repository.SalesOrderRepository;
import com.isms.repository.StockRecordRepository;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.List;

@Service
@Transactional
public class SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderLineItemRepository salesOrderLineItemRepository;
    private final ProductRepository productRepository;
    private final StockRecordRepository stockRecordRepository;
    private final StockRecordService stockRecordService;
    private final NotificationService notificationService;
    private final AppProperties appProperties;
    private final AuditLogger auditLogger;
    private final ObjectMapper objectMapper;

    @Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private SalesOrderService self;

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.context.ApplicationEventPublisher events;

    public SalesOrderService(
            SalesOrderRepository salesOrderRepository,
            SalesOrderLineItemRepository salesOrderLineItemRepository,
            ProductRepository productRepository,
            StockRecordRepository stockRecordRepository,
            StockRecordService stockRecordService,
            NotificationService notificationService,
            AppProperties appProperties,
            AuditLogger auditLogger,
            ObjectMapper objectMapper
    ) {
        this.salesOrderRepository = salesOrderRepository;
        this.salesOrderLineItemRepository = salesOrderLineItemRepository;
        this.productRepository = productRepository;
        this.stockRecordRepository = stockRecordRepository;
        this.stockRecordService = stockRecordService;
        this.notificationService = notificationService;
        this.appProperties = appProperties;
        this.auditLogger = auditLogger;
        this.objectMapper = objectMapper;
    }

    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void recordRejectedOrder(String orderId, String channel, String customerInfo, String skuId, int available, int requested) {
        SalesOrder rejectedOrder = new SalesOrder(orderId, channel, customerInfo, SalesStatus.REJECTED, null, OffsetDateTime.now());
        salesOrderRepository.save(rejectedOrder);

        notificationService.triggerInsufficientStock(skuId, orderId);

        auditLogger.log(orderId, "SALES_ORDER_REJECTED", "sales_orders", Map.of(
                "reason", "INSUFFICIENT_STOCK",
                "sku_id", skuId,
                "available", available,
                "requested", requested
        ));
    }

    public Map<String, Object> createOrder(String channel, String customerInfo, List<Map<String, Object>> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_LINES", "Order must contain at least one line item");
        }

        String orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 1. Check stock availability for all lines first
        for (Map<String, Object> line : lines) {
            String rawSku = (String) line.get("sku_id");
            final String skuId = (rawSku != null) ? rawSku : (String) line.get("skuId");
            Number qtyNum = (Number) line.get("quantity");
            int qty = qtyNum != null ? qtyNum.intValue() : 1;
            String loc = (String) line.get("location_id");
            if (loc == null) loc = (String) line.get("locationId");
            if (loc == null || loc.isBlank()) loc = "WH-01";

            StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(skuId, loc).orElse(null);
            int available = (stock != null) ? stock.getQuantityOnHand() : 0;

            if (available < qty) {
                // Reject order (Sales.Stock.Insufficient): recorded in its own transaction so the REJECTED order and the
                // manager notification are kept even though this sale aborts and rolls back.
                (self != null ? self : this).recordRejectedOrder(orderId, channel, customerInfo, skuId, available, qty);

                throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK",
                        String.format("Insufficient stock for SKU %s at location %s (available: %d, requested: %d)",
                                skuId, loc, available, qty));
            }
        }

        // 2. All stock available -> Create order
        SalesOrder order = new SalesOrder(orderId, channel, customerInfo, SalesStatus.COMPLETED, null, OffsetDateTime.now());

        // Design Decision (GAP-13): Physical sale deducts on order confirmation (SRS §A4.5),
        // while marketplace webhook orders deduct on payment confirmation (`order-paid`).
        int lineNum = 1;
        for (Map<String, Object> line : lines) {
            String rawSku = (String) line.get("sku_id");
            final String skuId = (rawSku != null) ? rawSku : (String) line.get("skuId");
            Number qtyNum = (Number) line.get("quantity");
            int qty = qtyNum != null ? qtyNum.intValue() : 1;
            String loc = (String) line.get("location_id");
            if (loc == null) loc = (String) line.get("locationId");
            if (loc == null || loc.isBlank()) loc = "WH-01";

            Product product = productRepository.findById(skuId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + skuId));

            SalesOrderLineItemId lineId = new SalesOrderLineItemId(order.getOrderId(), product.getSkuId(), lineNum++);
            SalesOrderLineItem lineItem = new SalesOrderLineItem(lineId, order, product, loc, qty, product.getUnitPrice());
            order.addLineItem(lineItem);
        }

        // 3. Mock Payment
        String paymentRef = "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        order.setPaymentReference(paymentRef);
        SalesOrder savedOrder = salesOrderRepository.save(order);

        // 4. Deduct stock for all line items and record actual demand
        for (SalesOrderLineItem item : savedOrder.getLineItems()) {
            stockRecordService.deductStock(item.getProduct().getSkuId(), item.getLocationId(), item.getQuantity());
            if (events != null) {
                events.publishEvent(new SaleRecordedEvent(item.getProduct().getSkuId(), item.getQuantity()));
            }
        }

        // 5. Generate invoice PDF
        (self != null ? self : this).generateInvoice(savedOrder.getOrderId());

        auditLogger.log(savedOrder.getOrderId(), "SALES_ORDER_COMPLETED", "sales_orders", Map.of(
                "channel", channel,
                "payment_ref", paymentRef,
                "lines_count", lines.size()
        ));

        return Map.of(
                "orderId", savedOrder.getOrderId(),
                "channel", savedOrder.getChannel(),
                "status", savedOrder.getStatus().getValue(),
                "paymentReference", paymentRef,
                "customerInfo", savedOrder.getCustomerInfo()
        );
    }

    public Map<String, Object> processWebhook(String marketplace, String signature, Map<String, Object> payload) {
        byte[] bodyBytes;
        try {
            bodyBytes = objectMapper.writeValueAsBytes(payload);
        } catch (Exception e) {
            bodyBytes = new byte[0];
        }
        return processWebhook(marketplace, signature, bodyBytes, payload);
    }

    public Map<String, Object> processWebhook(String marketplace, String signature, byte[] rawBody, Map<String, Object> payload) {
        verifyHmacSignature(marketplace, signature, rawBody);

        String event = (String) payload.get("event");
        String mktOrderId = (String) payload.get("order_id");
        if (mktOrderId == null) mktOrderId = (String) payload.get("orderId");
        if (mktOrderId == null) mktOrderId = "MKT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Optional<SalesOrder> existingOpt = salesOrderRepository.findById(mktOrderId);

        if ("order-created".equalsIgnoreCase(event)) {
            if (existingOpt.isPresent()) {
                return Map.of("status", "idempotent_ok", "orderId", mktOrderId);
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> lines = (List<Map<String, Object>>) payload.get("lines");
            String customerInfo = (String) payload.get("customer_info");
            createPendingOrder(mktOrderId, marketplace, customerInfo, lines);
            return Map.of("status", "created", "orderId", mktOrderId);

        } else if ("order-paid".equalsIgnoreCase(event)) {
            SalesOrder order;
            if (existingOpt.isPresent()) {
                order = existingOpt.get();
            } else {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> lines = (List<Map<String, Object>>) payload.get("lines");
                String customerInfo = (String) payload.get("customer_info");
                createPendingOrder(mktOrderId, marketplace, customerInfo, lines);
                order = salesOrderRepository.findById(mktOrderId).orElseThrow();
            }

            if (order.getStatus() == SalesStatus.COMPLETED) {
                return Map.of("status", "idempotent_ok", "orderId", mktOrderId);
            }

            // Deduct stock
            List<SalesOrderLineItem> items = salesOrderLineItemRepository.findByIdOrderId(order.getOrderId());
            for (SalesOrderLineItem item : items) {
                stockRecordService.deductStock(item.getProduct().getSkuId(), item.getLocationId(), item.getQuantity());
                if (events != null) {
                    events.publishEvent(new SaleRecordedEvent(item.getProduct().getSkuId(), item.getQuantity()));
                }
            }

            order.setStatus(SalesStatus.COMPLETED);
            order.setPaymentReference("MKT-PAY-" + mktOrderId);
            salesOrderRepository.save(order);

            (self != null ? self : this).generateInvoice(order.getOrderId());
            return Map.of("status", "processed", "orderId", order.getOrderId(), "event", event);

        } else if ("order-cancelled".equalsIgnoreCase(event)) {
            if (existingOpt.isPresent()) {
                SalesOrder order = existingOpt.get();
                order.setStatus(SalesStatus.CANCELLED);
                salesOrderRepository.save(order);
            }
            return Map.of("status", "cancelled", "orderId", mktOrderId);

        } else if ("order-returned".equalsIgnoreCase(event)) {
            (self != null ? self : this).processReturn(mktOrderId);
            return Map.of("status", "returned", "orderId", mktOrderId);

        } else {
            return Map.of("status", "ignored", "event", event != null ? event : "unknown");
        }
    }

    private void createPendingOrder(String orderId, String channel, String customerInfo, List<Map<String, Object>> lines) {
        SalesOrder order = new SalesOrder(orderId, channel, customerInfo != null ? customerInfo : "", SalesStatus.PENDING, null, OffsetDateTime.now());
        if (lines != null) {
            int lineNum = 1;
            for (Map<String, Object> line : lines) {
                String rawSku = (String) line.get("sku_id");
                final String skuId = (rawSku != null) ? rawSku : (String) line.get("skuId");
                Number qtyNum = (Number) line.get("quantity");
                int qty = qtyNum != null ? qtyNum.intValue() : 1;
                String loc = (String) line.get("location_id");
                if (loc == null) loc = (String) line.get("locationId");
                if (loc == null || loc.isBlank()) loc = "WH-01";

                Product product = productRepository.findById(skuId).orElse(null);
                if (product != null) {
                    SalesOrderLineItemId lineId = new SalesOrderLineItemId(order.getOrderId(), product.getSkuId(), lineNum++);
                    SalesOrderLineItem item = new SalesOrderLineItem(lineId, order, product, loc, qty, product.getUnitPrice());
                    order.addLineItem(item);
                }
            }
        }
        salesOrderRepository.save(order);
    }

    public void processReturn(String orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found: " + orderId));

        if (order.getStatus() == SalesStatus.RETURNED) {
            return; // Idempotent
        }

        List<SalesOrderLineItem> items = salesOrderLineItemRepository.findByIdOrderId(orderId);
        for (SalesOrderLineItem item : items) {
            String skuId = item.getProduct().getSkuId();
            String loc = item.getLocationId();
            int returnQty = item.getQuantity();

            StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(skuId, loc).orElse(null);
            int currentQty = stock != null ? stock.getQuantityOnHand() : 0;
            stockRecordService.updateStock(skuId, loc, currentQty + returnQty);
        }

        order.setStatus(SalesStatus.RETURNED);
        salesOrderRepository.save(order);

        auditLogger.log(orderId, "SALES_ORDER_RETURNED", "sales_orders", Map.of("items_returned", items.size()));
    }

    public byte[] generateInvoice(String orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found: " + orderId));

        List<SalesOrderLineItem> lines = salesOrderLineItemRepository.findByIdOrderId(orderId);

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 36, 36, 54, 54);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Header Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
            Paragraph title = new Paragraph("INVENTORY & STOCK MANAGEMENT SYSTEM (ISMS)", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.DARK_GRAY);
            Paragraph subtitle = new Paragraph("Tax Invoice & Delivery Receipt", subFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            document.add(subtitle);
            document.add(new Paragraph(" "));

            // Metadata Table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.addCell(new Phrase("Order ID: " + order.getOrderId(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            infoTable.addCell(new Phrase("Date: " + order.getCreatedAt().toLocalDate(), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            infoTable.addCell(new Phrase("Channel: " + order.getChannel(), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            infoTable.addCell(new Phrase("Status: " + order.getStatus().getValue(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            infoTable.addCell(new Phrase("Customer: " + order.getCustomerInfo(), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            infoTable.addCell(new Phrase("Payment Ref: " + (order.getPaymentReference() != null ? order.getPaymentReference() : "N/A"), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            document.add(infoTable);
            document.add(new Paragraph(" "));

            // Items Table
            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{3.5f, 1.5f, 1f, 1.5f, 1.5f});

            PdfPCell c1 = new PdfPCell(new Phrase("Item Description", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            PdfPCell c2 = new PdfPCell(new Phrase("Location", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            PdfPCell c3 = new PdfPCell(new Phrase("Qty", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            PdfPCell c4 = new PdfPCell(new Phrase("Unit Price", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            PdfPCell c5 = new PdfPCell(new Phrase("Total", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));

            table.addCell(c1);
            table.addCell(c2);
            table.addCell(c3);
            table.addCell(c4);
            table.addCell(c5);

            BigDecimal subtotal = BigDecimal.ZERO;
            for (SalesOrderLineItem item : lines) {
                table.addCell(new Phrase(item.getProduct().getName() + " (" + item.getProduct().getSkuId() + ")", FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase(item.getLocationId(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase(String.valueOf(item.getQuantity()), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase("₹" + item.getUnitPrice(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                table.addCell(new Phrase("₹" + lineTotal, FontFactory.getFont(FontFactory.HELVETICA, 9)));
                subtotal = subtotal.add(lineTotal);
            }
            document.add(table);

            // Calculation
            BigDecimal taxRate = (appProperties.taxRate() != null) ? appProperties.taxRate() : BigDecimal.valueOf(0.18);
            BigDecimal tax = subtotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal grandTotal = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

            Paragraph totals = new Paragraph(
                    String.format("\nSubtotal: ₹%s\nTax (%.0f%%): ₹%s\nGrand Total: ₹%s",
                            subtotal, taxRate.multiply(BigDecimal.valueOf(100)), tax, grandTotal),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11)
            );
            totals.setAlignment(Element.ALIGN_RIGHT);
            document.add(totals);

            document.close();
            byte[] pdfBytes = baos.toByteArray();

            // Write to disk at storage/invoices/{order_id}.pdf
            String storageBase = (appProperties.storageDir() != null) ? appProperties.storageDir() : "./storage";
            File invoiceFile = new File(storageBase, "invoices/" + orderId + ".pdf");
            if (invoiceFile.getParentFile() != null) {
                invoiceFile.getParentFile().mkdirs();
            }
            Files.write(invoiceFile.toPath(), pdfBytes);

            return pdfBytes;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INVOICE_GENERATION_FAILED", "Failed to generate invoice PDF: " + e.getMessage());
        }
    }

    public List<SalesOrder> listOrders(String channel, SalesStatus status, OffsetDateTime from, OffsetDateTime to) {
        if (channel != null || status != null || from != null || to != null) {
            return salesOrderRepository.filterOrders(channel, status, from, to);
        }
        return salesOrderRepository.findAllByOrderByCreatedAtDesc();
    }

    public SalesOrder getOrder(String orderId) {
        return salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found: " + orderId));
    }

    public List<SalesOrderLineItem> getLineItems(String orderId) {
        return salesOrderLineItemRepository.findByIdOrderId(orderId);
    }

    private void verifyHmacSignature(String marketplace, String signature, byte[] payloadBytes) {
        if (signature == null || signature.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "MISSING_SIGNATURE", "Missing X-Signature header");
        }

        String secret = getSecretForMarketplace(marketplace);

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(payloadBytes);
            String computedHex = HexFormat.of().formatHex(computed);

            if (!MessageDigest.isEqual(computedHex.getBytes(StandardCharsets.UTF_8), signature.trim().getBytes(StandardCharsets.UTF_8))) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SIGNATURE", "HMAC signature verification failed");
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SIGNATURE_ERROR", "Error computing HMAC: " + e.getMessage());
        }
    }

    private String getSecretForMarketplace(String marketplace) {
        if (appProperties.marketplaceSecrets() != null) {
            try {
                Map<String, String> map = objectMapper.readValue(
                        appProperties.marketplaceSecrets(),
                        new TypeReference<Map<String, String>>() {}
                );
                String secret = map.get(marketplace.toLowerCase());
                if (secret != null) return secret;
            } catch (Exception ignored) {}
        }
        return marketplace + "-secret";
    }
}
