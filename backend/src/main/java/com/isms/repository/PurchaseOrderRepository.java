package com.isms.repository;

import com.isms.model.PurchaseOrder;
import com.isms.model.enums.PoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {
    List<PurchaseOrder> findByStatus(PoStatus status);
    List<PurchaseOrder> findBySupplierSupplierId(String supplierId);
    List<PurchaseOrder> findByStatusAndSupplierSupplierId(PoStatus status, String supplierId);
    List<PurchaseOrder> findByStatusInAndExpectedDateBefore(List<PoStatus> statuses, LocalDate date);
    List<PurchaseOrder> findAllByOrderByOrderDateDesc();
}
