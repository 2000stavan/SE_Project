package com.isms.domain;

import com.isms.audit.AuditLogger;
import com.isms.config.AppProperties;
import com.isms.error.ApiException;
import com.isms.model.*;
import com.isms.model.enums.PoStatus;
import com.isms.repository.*;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@Transactional
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final PoLineItemRepository poLineItemRepository;
    private final UserRepository userRepository;
    private final StockRecordRepository stockRecordRepository;
    private final StockRecordService stockRecordService;
    private final SupplierService supplierService;
    private final NotificationService notificationService;
    private final AppProperties appProperties;
    private final AuditLogger auditLogger;

    @Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private PurchaseOrderService self;

    public PurchaseOrderService(
            PurchaseOrderRepository purchaseOrderRepository,
            SupplierRepository supplierRepository,
            ProductRepository productRepository,
            PoLineItemRepository poLineItemRepository,
            UserRepository userRepository,
            StockRecordRepository stockRecordRepository,
            StockRecordService stockRecordService,
            SupplierService supplierService,
            NotificationService notificationService,
            AppProperties appProperties,
            AuditLogger auditLogger
    ) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
        this.productRepository = productRepository;
        this.poLineItemRepository = poLineItemRepository;
        this.userRepository = userRepository;
        this.stockRecordRepository = stockRecordRepository;
        this.stockRecordService = stockRecordService;
        this.supplierService = supplierService;
        this.notificationService = notificationService;
        this.appProperties = appProperties;
        this.auditLogger = auditLogger;
    }

    public PurchaseOrder create(String supplierId, LocalDate expectedDate, List<Map<String, Object>> lines) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found: " + supplierId));

        if (Boolean.FALSE.equals(supplier.getIsActive())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INACTIVE_SUPPLIER", "Cannot create purchase order for inactive supplier");
        }

        if (lines == null || lines.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PO_LINES", "Purchase order must have at least one line item");
        }

        String poId = "PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        LocalDate orderDate = LocalDate.now();
        LocalDate expDate = expectedDate != null ? expectedDate : orderDate.plusDays(supplier.getLeadTime() != null ? supplier.getLeadTime() : 7);

        PurchaseOrder po = new PurchaseOrder(poId, supplier, PoStatus.DRAFT, orderDate, expDate, null, null);

        for (Map<String, Object> line : lines) {
            String rawSku = (String) line.get("sku_id");
            final String skuId = (rawSku != null) ? rawSku : (String) line.get("skuId");
            Number qtyNum = (Number) line.get("quantity");
            if (qtyNum == null) qtyNum = (Number) line.get("quantity_ordered");
            if (qtyNum == null) qtyNum = (Number) line.get("quantityOrdered");
            int qty = qtyNum != null ? qtyNum.intValue() : 1;

            if (qty <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_QUANTITY", "Line quantity must be positive");
            }

            Product product = productRepository.findById(skuId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + skuId));

            PoLineItemId lineId = new PoLineItemId(po.getPoId(), product.getSkuId());
            PoLineItem lineItem = new PoLineItem(lineId, po, product, qty, 0, null);
            po.addLineItem(lineItem);
        }

        PurchaseOrder savedPo = purchaseOrderRepository.save(po);

        auditLogger.log(savedPo.getPoId(), "PO_CREATED", "purchase_orders", Map.of(
                "supplier_id", supplierId,
                "lines_count", lines.size()
        ));

        return savedPo;
    }

    public PurchaseOrder submit(String poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found: " + poId));

        if (po.getStatus() != PoStatus.DRAFT) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    "Only DRAFT purchase orders can be submitted (current status: " + po.getStatus().getValue() + ")");
        }

        po.setStatus(PoStatus.PENDING_APPROVAL);
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        auditLogger.log(poId, "PO_SUBMITTED", "purchase_orders", Map.of("new_status", PoStatus.PENDING_APPROVAL.getValue()));
        return saved;
    }

    public void approve(String poId, String approverId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found: " + poId));

        if (po.getStatus() != PoStatus.PENDING_APPROVAL && po.getStatus() != PoStatus.DRAFT) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    "Purchase order cannot be approved from status: " + po.getStatus().getValue());
        }

        // Calculate order total
        BigDecimal orderTotal = calculatePoTotal(po.getPoId());

        // Check approver role & limits
        User approver = approverId != null ? userRepository.findByUserId(approverId).orElse(null) : null;
        boolean isManager = approver != null && approver.getRole().getValue().equals("Manager");
        if (isManager && appProperties.limits() != null && appProperties.limits().approvalLimitManager() != null) {
            BigDecimal managerLimit = appProperties.limits().approvalLimitManager();
            if (orderTotal.compareTo(managerLimit) > 0) {
                throw new ApiException(HttpStatus.FORBIDDEN, "APPROVAL_LIMIT_EXCEEDED",
                        String.format("PO total (%s) exceeds Manager approval limit (%s)", orderTotal, managerLimit));
            }
        }

        // BR-2: Supplier Credit Limit Check
        if (appProperties.limits() != null && appProperties.limits().supplierCreditLimit() != null) {
            BigDecimal creditLimit = appProperties.limits().supplierCreditLimit();
            BigDecimal currentExposure = calculateSupplierExposure(po.getSupplier().getSupplierId(), po.getPoId());
            BigDecimal projectedExposure = currentExposure.add(orderTotal);
            if (projectedExposure.compareTo(creditLimit) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "CREDIT_LIMIT_EXCEEDED",
                        String.format("Supplier credit limit exceeded. Current open exposure: %s, order: %s, limit: %s",
                                currentExposure, orderTotal, creditLimit));
            }
        }

        po.setStatus(PoStatus.APPROVED);
        if (approver != null) {
            po.setManager(approver);
        }
        purchaseOrderRepository.save(po);

        auditLogger.log(poId, "PO_APPROVED", "purchase_orders", Map.of(
                "approver", approverId != null ? approverId : "system",
                "total_amount", orderTotal
        ));
    }

    public void reject(String poId, String approverId, String reason) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found: " + poId));

        if (po.getStatus() != PoStatus.PENDING_APPROVAL) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    "Purchase order must be Pending Approval to reject (current status: " + po.getStatus().getValue() + ")");
        }

        // Design Decision (GAP-12): Following SRS §A8.1 — PO reverts to DRAFT with reason so creator can revise.
        // Use Case §B5 mentions CANCELLED, but SRS authoritative specification defines DRAFT return.
        po.setStatus(PoStatus.DRAFT);
        purchaseOrderRepository.save(po);

        // D8: Rejection reason sent as Order Update notification
        String msg = String.format("Purchase order %s was rejected: %s", poId, (reason != null && !reason.isBlank() ? reason : "No reason provided"));
        if (approverId != null) {
            userRepository.findByUserId(approverId).ifPresent(user -> {
                notificationService.createNotification(
                        user,
                        com.isms.model.enums.NotificationType.ORDER_UPDATE,
                        com.isms.model.enums.NotificationChannel.EMAIL,
                        msg
                );
            });
        }

        auditLogger.log(poId, "PO_REJECTED", "purchase_orders", Map.of(
                "approver", approverId != null ? approverId : "system",
                "reason", reason != null ? reason : ""
        ));
    }

    public void cancel(String poId, String userId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found: " + poId));

        if (po.getStatus() == PoStatus.RECEIVED || po.getStatus() == PoStatus.CANCELLED) {
            throw new ApiException(HttpStatus.CONFLICT, "CANNOT_CANCEL",
                    "Cannot cancel purchase order in status: " + po.getStatus().getValue());
        }

        boolean wasActive = (po.getStatus() == PoStatus.APPROVED || po.getStatus() == PoStatus.PARTIALLY_RECEIVED);
        po.setStatus(PoStatus.CANCELLED);
        purchaseOrderRepository.save(po);

        if (wasActive) {
            supplierService.trackPerformance(po.getSupplier().getSupplierId(), po.getStatus(), false, BigDecimal.valueOf(-0.10));
        }

        auditLogger.log(poId, "PO_CANCELLED", "purchase_orders", Map.of("user_id", userId != null ? userId : "system"));
    }

    public void receiveConfirm(String poId, String staffId, List<Map<String, Object>> lines) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found: " + poId));

        if (po.getStatus() != PoStatus.APPROVED && po.getStatus() != PoStatus.PARTIALLY_RECEIVED) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATUS_FOR_RECEIPT",
                    "PO must be Approved or Partially Received to record receipt (current status: " + po.getStatus().getValue() + ")");
        }

        if (staffId != null) {
            userRepository.findByUserId(staffId).ifPresent(po::setWarehouseStaff);
        }

        List<PoLineItem> existingLines = poLineItemRepository.findByIdPoId(po.getPoId());
        Map<String, PoLineItem> lineMap = new HashMap<>();
        for (PoLineItem item : existingLines) {
            lineMap.put(item.getProduct().getSkuId(), item);
        }

        if (lines != null) {
            for (Map<String, Object> line : lines) {
                String skuId = (String) line.get("sku_id");
                if (skuId == null) skuId = (String) line.get("skuId");
                Number qtyNum = (Number) line.get("quantity");
                if (qtyNum == null) qtyNum = (Number) line.get("quantity_received");
                if (qtyNum == null) qtyNum = (Number) line.get("quantityReceived");
                int qtyReceived = qtyNum != null ? qtyNum.intValue() : 0;
                String location = (String) line.get("location");
                if (location == null || location.isBlank()) location = "WH-01";

                if (qtyReceived > 0 && lineMap.containsKey(skuId)) {
                    PoLineItem item = lineMap.get(skuId);
                    item.setQuantityReceived(item.getQuantityReceived() + qtyReceived);
                    item.setLastReceivedAt(OffsetDateTime.now());
                    poLineItemRepository.save(item);

                    // Update stock record and trigger realtime sync
                    StockRecord existingStock = stockRecordRepository.findByIdSkuIdAndIdLocationId(skuId, location).orElse(null);
                    int currentQty = existingStock != null ? existingStock.getQuantityOnHand() : 0;
                    stockRecordService.updateStock(skuId, location, currentQty + qtyReceived);
                }
            }
        }

        // Check if all lines are fully received
        boolean allFullyReceived = true;
        for (PoLineItem item : existingLines) {
            if (item.getQuantityReceived() < item.getQuantityOrdered()) {
                allFullyReceived = false;
                break;
            }
        }

        if (allFullyReceived) {
            po.setStatus(PoStatus.RECEIVED);
            // Track supplier on-time performance
            boolean onTime = !LocalDate.now().isAfter(po.getExpectedDate());
            BigDecimal ratingAdj = onTime ? BigDecimal.valueOf(0.10) : BigDecimal.valueOf(-0.10);
            supplierService.trackPerformance(po.getSupplier().getSupplierId(), po.getStatus(), onTime, ratingAdj);
        } else {
            po.setStatus(PoStatus.PARTIALLY_RECEIVED);
        }

        purchaseOrderRepository.save(po);

        auditLogger.log(poId, "PO_RECEIPT_CONFIRMED", "purchase_orders", Map.of(
                "new_status", po.getStatus().getValue(),
                "all_received", allFullyReceived
        ));
    }

    public List<PurchaseOrder> flagOverdue() {
        LocalDate today = LocalDate.now();
        List<PurchaseOrder> overdue = purchaseOrderRepository.findByStatusInAndExpectedDateBefore(
                List.of(PoStatus.APPROVED, PoStatus.PARTIALLY_RECEIVED),
                today
        );

        for (PurchaseOrder po : overdue) {
            notificationService.triggerShippingDelay(po.getPoId(), po.getSupplier().getSupplierId());
        }

        return overdue;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void scheduledFlagOverdue() {
        flagOverdue();
    }

    public List<PurchaseOrder> listOrders(PoStatus status, String supplierId) {
        if (status != null && supplierId != null && !supplierId.isBlank()) {
            return purchaseOrderRepository.findByStatusAndSupplierSupplierId(status, supplierId);
        } else if (status != null) {
            return purchaseOrderRepository.findByStatus(status);
        } else if (supplierId != null && !supplierId.isBlank()) {
            return purchaseOrderRepository.findBySupplierSupplierId(supplierId);
        } else {
            return purchaseOrderRepository.findAllByOrderByOrderDateDesc();
        }
    }

    public PurchaseOrder getPurchaseOrder(String poId) {
        return purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found: " + poId));
    }

    public List<PoLineItem> getLineItems(String poId) {
        return poLineItemRepository.findByIdPoId(poId);
    }

    public BigDecimal calculatePoTotal(String poId) {
        List<PoLineItem> items = poLineItemRepository.findByIdPoId(poId);
        BigDecimal total = BigDecimal.ZERO;
        for (PoLineItem item : items) {
            BigDecimal price = item.getProduct().getUnitPrice();
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(item.getQuantityOrdered()));
            total = total.add(lineTotal);
        }
        return total;
    }

    public BigDecimal calculateSupplierExposure(String supplierId, String excludePoId) {
        List<PurchaseOrder> openOrders = purchaseOrderRepository.findBySupplierSupplierId(supplierId).stream()
                .filter(po -> po.getStatus() == PoStatus.PENDING_APPROVAL ||
                              po.getStatus() == PoStatus.APPROVED ||
                              po.getStatus() == PoStatus.PARTIALLY_RECEIVED)
                .filter(po -> !po.getPoId().equals(excludePoId))
                .toList();

        BigDecimal exposure = BigDecimal.ZERO;
        for (PurchaseOrder po : openOrders) {
            exposure = exposure.add(calculatePoTotal(po.getPoId()));
        }
        return exposure;
    }
}
