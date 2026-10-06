package com.isms.domain;

import com.isms.error.ApiException;
import com.isms.model.PurchaseOrder;
import com.isms.model.Supplier;
import com.isms.model.enums.PoStatus;
import com.isms.repository.PurchaseOrderRepository;
import com.isms.repository.SupplierRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository, SupplierRepository supplierRepository) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
    }

    public PurchaseOrder create(String supplierId, LocalDate expectedDate, List<Map<String, Object>> lines) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUPPLIER_NOT_FOUND", "Supplier not found"));

        String poId = "PO-" + System.currentTimeMillis();
        PurchaseOrder po = new PurchaseOrder(poId, supplier, PoStatus.DRAFT, LocalDate.now(), expectedDate, null, null);
        return purchaseOrderRepository.save(po);
    }

    public void approve(String poId, String approverId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found"));
        po.setStatus(PoStatus.APPROVED);
        purchaseOrderRepository.save(po);
    }

    public void reject(String poId, String approverId, String reason) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found"));
        po.setStatus(PoStatus.DRAFT);
        purchaseOrderRepository.save(po);
    }

    public void receiveConfirm(String poId, String staffId, List<Map<String, Object>> lines) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", "Purchase order not found"));
        po.setStatus(PoStatus.RECEIVED);
        purchaseOrderRepository.save(po);
    }

    public List<PurchaseOrder> flagOverdue() {
        return purchaseOrderRepository.findOverdueOrders(LocalDate.now());
    }
}
