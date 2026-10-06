package com.isms;

import com.isms.domain.ProductService;
import com.isms.domain.PurchaseOrderService;
import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.model.PurchaseOrder;
import com.isms.model.Supplier;
import com.isms.model.enums.PoStatus;
import com.isms.repository.ProductRepository;
import com.isms.repository.PurchaseOrderRepository;
import com.isms.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PoStateMachineTest {

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private ProductService productService;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    private String supplierId;
    private String skuId;

    @BeforeEach
    void setUp() {
        supplierId = "SUP-SM-" + System.currentTimeMillis();
        skuId = "SKU-SM-" + System.currentTimeMillis();

        supplierRepository.save(new Supplier(
                supplierId, "State Machine Vendor", "vendor@sm.com",
                BigDecimal.valueOf(4.0), 5, "[]", true
        ));

        productService.create(new Product(
                skuId, "Test Product SM", "Hardware",
                BigDecimal.valueOf(25.00), 10, "PCS"
        ));
    }

    @Test
    @DisplayName("PO State Machine: Legal happy path lifecycle (Draft -> Pending Approval -> Approved -> Received)")
    void testLegalLifecycle() {
        PurchaseOrder po = purchaseOrderService.create(
                supplierId,
                LocalDate.now().plusDays(7),
                List.of(Map.of("sku_id", skuId, "quantity", 10, "unit_price", 25.00))
        );
        assertEquals(PoStatus.DRAFT, po.getStatus());

        // Submit -> Pending Approval
        purchaseOrderService.submit(po.getPoId());
        assertEquals(PoStatus.PENDING_APPROVAL, purchaseOrderRepository.findById(po.getPoId()).orElseThrow().getStatus());

        // Approve -> Approved
        purchaseOrderService.approve(po.getPoId(), "USR-MGR-1");
        assertEquals(PoStatus.APPROVED, purchaseOrderRepository.findById(po.getPoId()).orElseThrow().getStatus());

        // Receive -> Received
        purchaseOrderService.receiveConfirm(
                po.getPoId(),
                "USR-STAFF-1",
                List.of(Map.of("sku_id", skuId, "quantity_received", 10))
        );
        assertEquals(PoStatus.RECEIVED, purchaseOrderRepository.findById(po.getPoId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("PO State Machine: Rejection reverts status from Pending Approval to Draft with reason")
    void testRejectionToDraft() {
        PurchaseOrder po = purchaseOrderService.create(
                supplierId,
                LocalDate.now().plusDays(7),
                List.of(Map.of("sku_id", skuId, "quantity", 5, "unit_price", 25.00))
        );
        purchaseOrderService.submit(po.getPoId());

        purchaseOrderService.reject(po.getPoId(), "USR-MGR-1", "Price renegotiation needed");
        assertEquals(PoStatus.DRAFT, purchaseOrderRepository.findById(po.getPoId()).orElseThrow().getStatus());

        // Can be re-submitted
        purchaseOrderService.submit(po.getPoId());
        assertEquals(PoStatus.PENDING_APPROVAL, purchaseOrderRepository.findById(po.getPoId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("PO State Machine: Illegal transition violations throw ApiException")
    void testIllegalTransitionsThrow() {
        PurchaseOrder po = purchaseOrderService.create(
                supplierId,
                LocalDate.now().plusDays(7),
                List.of(Map.of("sku_id", skuId, "quantity", 10, "unit_price", 25.00))
        );

        // Cannot receive an unapproved Draft PO
        assertThrows(ApiException.class, () ->
                purchaseOrderService.receiveConfirm(
                        po.getPoId(),
                        "USR-STAFF-1",
                        List.of(Map.of("sku_id", skuId, "quantity_received", 10))
                )
        );

        // Cancel PO from Draft
        purchaseOrderService.cancel(po.getPoId(), "USR-MGR-1");
        assertEquals(PoStatus.CANCELLED, purchaseOrderRepository.findById(po.getPoId()).orElseThrow().getStatus());

        // Cannot approve a Cancelled PO
        assertThrows(ApiException.class, () ->
                purchaseOrderService.approve(po.getPoId(), "USR-MGR-1")
        );

        // Cannot submit a Cancelled PO
        assertThrows(ApiException.class, () ->
                purchaseOrderService.submit(po.getPoId())
        );
    }
}
