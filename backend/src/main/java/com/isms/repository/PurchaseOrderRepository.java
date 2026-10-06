package com.isms.repository;

import com.isms.model.PurchaseOrder;
import com.isms.model.enums.PoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {
    List<PurchaseOrder> findByStatus(PoStatus status);
    List<PurchaseOrder> findBySupplierSupplierId(String supplierId);

    @Query("SELECT po FROM PurchaseOrder po WHERE po.status IN ('Approved', 'Partially Received') AND po.expectedDate < :today")
    List<PurchaseOrder> findOverdueOrders(@Param("today") LocalDate today);

    @Query("SELECT po FROM PurchaseOrder po WHERE " +
           "(:status IS NULL OR po.status = :status) AND " +
           "(:supplierId IS NULL OR po.supplier.supplierId = :supplierId)")
    List<PurchaseOrder> filterOrders(@Param("status") PoStatus status, @Param("supplierId") String supplierId);
}
