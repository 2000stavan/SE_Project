package com.isms;

import com.isms.config.AppProperties;
import com.isms.domain.*;
import com.isms.error.ApiException;
import com.isms.model.*;
import com.isms.model.enums.PoStatus;
import com.isms.repository.ProductRepository;
import com.isms.repository.PurchaseOrderRepository;
import com.isms.repository.StockRecordRepository;
import com.isms.repository.SupplierRepository;
import com.isms.trace.CallTrace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class Seq2PurchaseOrderTest {

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private ProductService productService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private ManagerService managerService;

    @Autowired
    private WarehouseStaffService warehouseStaffService;

    @Autowired
    private AdministratorService administratorService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private StockRecordRepository stockRecordRepository;

    @Autowired
    private CallTrace callTrace;

    @BeforeEach
    void setUp() {
        callTrace.clear();
    }

    @Test
    @DisplayName("Sequence 2: Purchase Order flow with Approval & Receipt branch")
    void testSequence2ApprovalAndReceiptBranch() {
        String supId = "SUP-SEQ2-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Acme Supplies", "acme@test.com", BigDecimal.valueOf(4.50), 5, "", true);
        supplierService.create(sup);

        String sku = "SKU-SEQ2-P1-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Widget A", "Hardware", BigDecimal.valueOf(50.00), 10, "PCS");
        productService.create(prod);

        callTrace.clear();

        // 1. Supplier.search
        List<Supplier> foundSuppliers = supplierService.search("Acme", BigDecimal.valueOf(4.0));
        assertFalse(foundSuppliers.isEmpty());

        // 2. Product.search
        List<Product> foundProducts = productService.search("Widget", "Hardware");
        assertFalse(foundProducts.isEmpty());

        // 3. PurchaseOrder.create
        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().plusDays(5),
                List.of(Map.of("sku_id", sku, "quantity", 20))
        );
        assertEquals(PoStatus.DRAFT, po.getStatus());

        // 4. Submit PO -> Pending Approval
        purchaseOrderService.submit(po.getPoId());

        // 5. Manager.approve_po -> calls PurchaseOrder.approve
        managerService.approvePo(po.getPoId(), "USR-MGR-1");

        PurchaseOrder approvedPo = purchaseOrderService.getPurchaseOrder(po.getPoId());
        assertEquals(PoStatus.APPROVED, approvedPo.getStatus());

        // 6. WarehouseStaff.receive_po_confirm -> calls PurchaseOrder.receive_confirm -> Supplier.track_performance
        warehouseStaffService.receivePoConfirm(
                po.getPoId(),
                "USR-WH-1",
                List.of(Map.of("sku_id", sku, "quantity", 20, "location", "WH-01"))
        );

        PurchaseOrder receivedPo = purchaseOrderService.getPurchaseOrder(po.getPoId());
        assertEquals(PoStatus.RECEIVED, receivedPo.getStatus());

        // Check stock was incremented by 20
        StockRecord stock = stockRecordRepository.findByIdSkuIdAndIdLocationId(sku, "WH-01").orElseThrow();
        assertTrue(stock.getQuantityOnHand() >= 20, "Stock must be incremented by PO receipt");

        // Verify message order matching Sequence 2 diagram
        List<String> actualCalls = callTrace.getCalls();
        assertTrue(actualCalls.contains("SupplierService.search"), "Must contain SupplierService.search");
        assertTrue(actualCalls.contains("ProductService.search"), "Must contain ProductService.search");
        assertTrue(actualCalls.contains("PurchaseOrderService.create"), "Must contain PurchaseOrderService.create");
        assertTrue(actualCalls.contains("ManagerService.approvePo"), "Must contain ManagerService.approvePo");
        assertTrue(actualCalls.contains("PurchaseOrderService.approve"), "Must contain PurchaseOrderService.approve");
        assertTrue(actualCalls.contains("WarehouseStaffService.receivePoConfirm"), "Must contain WarehouseStaffService.receivePoConfirm");
        assertTrue(actualCalls.contains("PurchaseOrderService.receiveConfirm"), "Must contain PurchaseOrderService.receiveConfirm");
        assertTrue(actualCalls.contains("SupplierService.trackPerformance"), "Must contain SupplierService.trackPerformance");

        int idxSearchSup = actualCalls.indexOf("SupplierService.search");
        int idxSearchProd = actualCalls.indexOf("ProductService.search");
        int idxCreate = actualCalls.indexOf("PurchaseOrderService.create");
        int idxApprovePo = actualCalls.indexOf("ManagerService.approvePo");
        int idxApprove = actualCalls.indexOf("PurchaseOrderService.approve");
        int idxReceivePo = actualCalls.indexOf("WarehouseStaffService.receivePoConfirm");
        int idxReceive = actualCalls.indexOf("PurchaseOrderService.receiveConfirm");
        int idxTrack = actualCalls.indexOf("SupplierService.trackPerformance");

        assertTrue(idxSearchSup < idxSearchProd, "SupplierService.search before ProductService.search");
        assertTrue(idxSearchProd < idxCreate, "ProductService.search before PurchaseOrderService.create");
        assertTrue(idxCreate < idxApprovePo, "PO.create before Manager.approvePo");
        assertTrue(idxApprovePo <= idxApprove, "Manager.approvePo invokes PO.approve");
        assertTrue(idxApprove < idxReceivePo, "PO.approve before WarehouseStaff.receivePoConfirm");
        assertTrue(idxReceivePo <= idxReceive, "WarehouseStaff.receivePoConfirm invokes PO.receiveConfirm");
        assertTrue(idxReceive <= idxTrack, "PO.receiveConfirm invokes Supplier.trackPerformance");
    }

    @Test
    @DisplayName("Sequence 2: Purchase Order flow with Rejection branch")
    void testSequence2RejectionBranch() {
        String supId = "SUP-SEQ2-REJ-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Reject Supplies", "rej@test.com", BigDecimal.valueOf(3.50), 7, "", true);
        supplierService.create(sup);

        String sku = "SKU-SEQ2-REJ-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Widget B", "Tools", BigDecimal.valueOf(30.00), 5, "PCS");
        productService.create(prod);

        callTrace.clear();

        // 1. Supplier search
        supplierService.search("Reject", null);

        // 2. Product search
        productService.search("Widget B", null);

        // 3. PurchaseOrder.create
        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().plusDays(3),
                List.of(Map.of("sku_id", sku, "quantity", 10))
        );

        // Submit to Pending Approval
        purchaseOrderService.submit(po.getPoId());

        // 4. Alt Branch 2: Manager.reject_po -> PurchaseOrder.reject
        managerService.rejectPo(po.getPoId(), "USR-MGR-1", "Budget constraints for Q4");

        PurchaseOrder rejectedPo = purchaseOrderService.getPurchaseOrder(po.getPoId());
        assertEquals(PoStatus.DRAFT, rejectedPo.getStatus(), "Rejected PO must revert to DRAFT");

        List<String> actualCalls = callTrace.getCalls();
        assertTrue(actualCalls.contains("ManagerService.rejectPo"), "Must contain ManagerService.rejectPo");
        assertTrue(actualCalls.contains("PurchaseOrderService.reject"), "Must contain PurchaseOrderService.reject");

        int idxRejectPo = actualCalls.indexOf("ManagerService.rejectPo");
        int idxReject = actualCalls.indexOf("PurchaseOrderService.reject");
        assertTrue(idxRejectPo <= idxReject, "Manager.rejectPo invokes PO.reject");
    }

    @Test
    @DisplayName("Sequence 2: Optional overdue detection triggers shipping delay alert")
    void testSequence2OverdueBranch() {
        String supId = "SUP-OVERDUE-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Late Supplies", "late@test.com", BigDecimal.valueOf(2.00), 10, "", true);
        supplierService.create(sup);

        String sku = "SKU-OVERDUE-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Late Item", "Parts", BigDecimal.valueOf(10.00), 5, "PCS");
        productService.create(prod);

        // Create PO with expected date yesterday
        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().minusDays(2),
                List.of(Map.of("sku_id", sku, "quantity", 15))
        );
        purchaseOrderService.submit(po.getPoId());
        purchaseOrderService.approve(po.getPoId(), "USR-ADMIN-1");

        callTrace.clear();

        // Opt: PurchaseOrder.flag_overdue -> Notification.trigger_shipping_delay
        List<PurchaseOrder> overdue = purchaseOrderService.flagOverdue();
        assertFalse(overdue.isEmpty(), "Overdue list must not be empty");

        List<String> calls = callTrace.getCalls();
        assertTrue(calls.contains("PurchaseOrderService.flagOverdue"), "Must call PurchaseOrderService.flagOverdue");
        assertTrue(calls.contains("NotificationService.triggerShippingDelay"), "Must call NotificationService.triggerShippingDelay");
    }

    @Test
    @DisplayName("BR-2: Manager approval limit exceeded blocks Manager but allows Administrator")
    void testManagerApprovalLimitEnforced() {
        String supId = "SUP-LIMIT-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Big Value Supplies", "big@test.com", BigDecimal.valueOf(4.00), 5, "", true);
        supplierService.create(sup);

        // Product with unit price 120,000 (exceeds default manager limit of 100,000)
        String sku = "SKU-EXPENSIVE-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Heavy Machinery", "Equipment", BigDecimal.valueOf(120000.00), 1, "PCS");
        productService.create(prod);

        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().plusDays(10),
                List.of(Map.of("sku_id", sku, "quantity", 1))
        );
        purchaseOrderService.submit(po.getPoId());

        // Manager approval must fail with 403 Forbidden
        ApiException ex = assertThrows(ApiException.class, () -> managerService.approvePo(po.getPoId(), "USR-MGR-1"));
        assertEquals("APPROVAL_LIMIT_EXCEEDED", ex.getCode());

        // Administrator approval must succeed
        assertDoesNotThrow(() -> purchaseOrderService.approve(po.getPoId(), "USR-ADMIN-1"));
        assertEquals(PoStatus.APPROVED, purchaseOrderService.getPurchaseOrder(po.getPoId()).getStatus());
    }

    @Test
    @DisplayName("BR-2: Supplier credit limit check blocks both Manager and Admin")
    void testSupplierCreditLimitEnforced() {
        String supId = "SUP-CREDIT-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Credit Cap Supplies", "credit@test.com", BigDecimal.valueOf(4.00), 5, "", true);
        supplierService.create(sup);

        // Product with unit price 600,000 (exceeds default credit limit of 500,000)
        String sku = "SKU-MEGA-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Industrial Turbine", "Power", BigDecimal.valueOf(600000.00), 1, "PCS");
        productService.create(prod);

        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().plusDays(10),
                List.of(Map.of("sku_id", sku, "quantity", 1))
        );
        purchaseOrderService.submit(po.getPoId());

        // Admin attempting to approve order that exceeds credit limit must fail
        ApiException ex = assertThrows(ApiException.class, () -> purchaseOrderService.approve(po.getPoId(), "USR-ADMIN-1"));
        assertEquals("CREDIT_LIMIT_EXCEEDED", ex.getCode());
    }

    @Test
    @DisplayName("Partial receipt transitions to PARTIALLY_RECEIVED and then to RECEIVED on completion")
    void testPartialReceiptWorkflow() {
        String supId = "SUP-PARTIAL-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Partial Vendor", "part@test.com", BigDecimal.valueOf(4.00), 5, "", true);
        supplierService.create(sup);

        String sku = "SKU-PARTIAL-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Partial Unit", "Items", BigDecimal.valueOf(10.00), 5, "PCS");
        productService.create(prod);

        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().plusDays(5),
                List.of(Map.of("sku_id", sku, "quantity", 10))
        );
        purchaseOrderService.submit(po.getPoId());
        purchaseOrderService.approve(po.getPoId(), "USR-ADMIN-1");

        // First receipt: receive 4 of 10
        warehouseStaffService.receivePoConfirm(
                po.getPoId(),
                "USR-WH-1",
                List.of(Map.of("sku_id", sku, "quantity", 4, "location", "WH-01"))
        );

        PurchaseOrder partialPo = purchaseOrderService.getPurchaseOrder(po.getPoId());
        assertEquals(PoStatus.PARTIALLY_RECEIVED, partialPo.getStatus());

        // Second receipt: receive remaining 6 of 10
        warehouseStaffService.receivePoConfirm(
                po.getPoId(),
                "USR-WH-1",
                List.of(Map.of("sku_id", sku, "quantity", 6, "location", "WH-01"))
        );

        PurchaseOrder completedPo = purchaseOrderService.getPurchaseOrder(po.getPoId());
        assertEquals(PoStatus.RECEIVED, completedPo.getStatus());
    }

    @Test
    @DisplayName("BR-5: Deactivate supplier is blocked when open POs exist")
    void testDeactivateSupplierBlockedWithOpenPos() {
        String supId = "SUP-OPEN-PO-" + System.currentTimeMillis();
        Supplier sup = new Supplier(supId, "Active PO Vendor", "activepo@test.com", BigDecimal.valueOf(4.00), 5, "", true);
        supplierService.create(sup);

        String sku = "SKU-ACTIVE-PO-" + System.currentTimeMillis();
        Product prod = new Product(sku, "Active PO Unit", "Items", BigDecimal.valueOf(10.00), 5, "PCS");
        productService.create(prod);

        PurchaseOrder po = purchaseOrderService.create(
                supId,
                LocalDate.now().plusDays(5),
                List.of(Map.of("sku_id", sku, "quantity", 5))
        );

        // Attempting to deactivate supplier while open PO exists should throw 409
        ApiException ex = assertThrows(ApiException.class, () -> administratorService.deactivateSupplier(supId));
        assertEquals("OPEN_POS_EXIST", ex.getCode());

        // Cancel the PO
        purchaseOrderService.cancel(po.getPoId(), "USR-ADMIN-1");

        // Now deactivation succeeds
        assertDoesNotThrow(() -> administratorService.deactivateSupplier(supId));
        Supplier deactivated = supplierRepository.findById(supId).orElseThrow();
        assertFalse(deactivated.getIsActive());
    }
}
