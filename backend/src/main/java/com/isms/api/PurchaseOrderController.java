package com.isms.api;

import com.isms.domain.ManagerService;
import com.isms.domain.PurchaseOrderService;
import com.isms.domain.WarehouseStaffService;
import com.isms.model.PoLineItem;
import com.isms.model.PurchaseOrder;
import com.isms.model.enums.PoStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final ManagerService managerService;
    private final WarehouseStaffService warehouseStaffService;

    public PurchaseOrderController(
            PurchaseOrderService purchaseOrderService,
            ManagerService managerService,
            WarehouseStaffService warehouseStaffService
    ) {
        this.purchaseOrderService = purchaseOrderService;
        this.managerService = managerService;
        this.warehouseStaffService = warehouseStaffService;
    }

    public record CreatePoRequest(
            String supplier_id,
            String supplierId,
            LocalDate expected_date,
            LocalDate expectedDate,
            List<Map<String, Object>> lines
    ) {}

    public record RejectPoRequest(
            String reason
    ) {}

    public record ReceivePoRequest(
            List<Map<String, Object>> lines
    ) {}

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody CreatePoRequest request) {
        String supId = request.supplier_id() != null ? request.supplier_id() : request.supplierId();
        LocalDate expDate = request.expected_date() != null ? request.expected_date() : request.expectedDate();
        PurchaseOrder created = purchaseOrderService.create(supId, expDate, request.lines());
        // Re-load: save() on an assigned-id entity merges, leaving lazy product proxies that cannot be read after the session closes.
        return ResponseEntity.status(201).body(serializePo(purchaseOrderService.getPurchaseOrder(created.getPoId())));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> submit(@PathVariable("id") String id) {
        PurchaseOrder po = purchaseOrderService.submit(id);
        return ResponseEntity.ok(serializePo(po));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable("id") String id) {
        String userId = getCurrentUserId();
        managerService.approvePo(id, userId);
        PurchaseOrder po = purchaseOrderService.getPurchaseOrder(id);
        return ResponseEntity.ok(serializePo(po));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable("id") String id,
            @RequestBody(required = false) RejectPoRequest request
    ) {
        String userId = getCurrentUserId();
        String reason = (request != null && request.reason() != null) ? request.reason() : "Rejected by manager";
        managerService.rejectPo(id, userId, reason);
        PurchaseOrder po = purchaseOrderService.getPurchaseOrder(id);
        return ResponseEntity.ok(serializePo(po));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable("id") String id) {
        String userId = getCurrentUserId();
        purchaseOrderService.cancel(id, userId);
        PurchaseOrder po = purchaseOrderService.getPurchaseOrder(id);
        return ResponseEntity.ok(serializePo(po));
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('WAREHOUSE_STAFF', 'MANAGER', 'ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> receive(
            @PathVariable("id") String id,
            @RequestBody ReceivePoRequest request
    ) {
        String staffId = getCurrentUserId();
        warehouseStaffService.receivePoConfirm(id, staffId, request.lines());
        PurchaseOrder po = purchaseOrderService.getPurchaseOrder(id);
        return ResponseEntity.ok(serializePo(po));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(value = "status", required = false) String statusStr,
            @RequestParam(value = "supplier", required = false) String supplierId
    ) {
        PoStatus status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            for (PoStatus s : PoStatus.values()) {
                if (s.getValue().equalsIgnoreCase(statusStr) || s.name().equalsIgnoreCase(statusStr)) {
                    status = s;
                    break;
                }
            }
        }
        List<PurchaseOrder> list = purchaseOrderService.listOrders(status, supplierId);
        List<Map<String, Object>> response = list.stream().map(this::serializePoSummary).toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable("id") String id) {
        PurchaseOrder po = purchaseOrderService.getPurchaseOrder(id);
        return ResponseEntity.ok(serializePo(po));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<List<Map<String, Object>>> getOverdue() {
        List<PurchaseOrder> overdue = purchaseOrderService.flagOverdue();
        List<Map<String, Object>> response = overdue.stream().map(this::serializePoSummary).toList();
        return ResponseEntity.ok(response);
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getPrincipal() != null) ? auth.getPrincipal().toString() : "system";
    }

    private Map<String, Object> serializePo(PurchaseOrder po) {
        Map<String, Object> map = serializePoSummary(po);
        List<PoLineItem> items = purchaseOrderService.getLineItems(po.getPoId());
        List<Map<String, Object>> linesData = items.stream().map(item -> {
            Map<String, Object> line = new HashMap<>();
            line.put("skuId", item.getProduct().getSkuId());
            line.put("productName", item.getProduct().getName());
            line.put("quantityOrdered", item.getQuantityOrdered());
            line.put("quantityReceived", item.getQuantityReceived());
            line.put("unitPrice", item.getProduct().getUnitPrice());
            line.put("lastReceivedAt", item.getLastReceivedAt() != null ? item.getLastReceivedAt().toString() : null);
            return line;
        }).toList();

        map.put("lines", linesData);
        map.put("totalAmount", purchaseOrderService.calculatePoTotal(po.getPoId()));
        return map;
    }

    private Map<String, Object> serializePoSummary(PurchaseOrder po) {
        Map<String, Object> map = new HashMap<>();
        map.put("poId", po.getPoId());
        map.put("status", po.getStatus().getValue());
        map.put("orderDate", po.getOrderDate().toString());
        map.put("expectedDate", po.getExpectedDate() != null ? po.getExpectedDate().toString() : null);
        map.put("supplierId", po.getSupplier().getSupplierId());
        map.put("supplierName", po.getSupplier().getName());
        map.put("managerId", po.getManager() != null ? po.getManager().getUserId() : null);
        map.put("warehouseStaffId", po.getWarehouseStaff() != null ? po.getWarehouseStaff().getUserId() : null);
        return map;
    }
}
