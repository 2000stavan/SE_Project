package com.isms.unit;

import com.isms.audit.AuditLogger;
import com.isms.config.AppProperties;
import com.isms.domain.NotificationService;
import com.isms.domain.PurchaseOrderService;
import com.isms.domain.StockRecordService;
import com.isms.domain.SupplierService;
import com.isms.error.ApiException;
import com.isms.model.*;
import com.isms.model.enums.PoStatus;
import com.isms.model.enums.Role;
import com.isms.model.enums.UserStatus;
import com.isms.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Experiment 10, Unit 3: PurchaseOrderService.approve() (SRS PO.Approve, BR-1, BR-2).
 * The repositories and the audit logger are Mockito mocks; no Spring context, no database.
 * Test case IDs match Table 10 of the report.
 */
class PurchaseOrderApproveUnitTest {

    private static final Supplier SUPPLIER = new Supplier("SUP-1", "Supplier One", null, null, 7, null, true);

    private PurchaseOrderRepository poRepo;
    private PoLineItemRepository lineRepo;
    private UserRepository userRepo;
    private AuditLogger audit;
    private PurchaseOrderService service;

    /** All orders of SUP-1, returned by findBySupplierSupplierId. */
    private final List<PurchaseOrder> supplierOrders = new ArrayList<>();

    @BeforeEach
    void setUp() {
        poRepo = mock(PurchaseOrderRepository.class);
        lineRepo = mock(PoLineItemRepository.class);
        userRepo = mock(UserRepository.class);
        audit = mock(AuditLogger.class);
        when(poRepo.findBySupplierSupplierId("SUP-1")).thenReturn(supplierOrders);
        service = build(new BigDecimal("100000"), new BigDecimal("500000")); // manager limit, credit limit
    }

    private PurchaseOrderService build(BigDecimal managerLimit, BigDecimal creditLimit) {
        AppProperties.Limits limits = (managerLimit == null && creditLimit == null)
                ? null : new AppProperties.Limits(managerLimit, creditLimit);
        AppProperties props = new AppProperties(null, null, null, limits, null, null, null, null);
        return new PurchaseOrderService(poRepo, mock(SupplierRepository.class), mock(ProductRepository.class),
                lineRepo, userRepo, mock(StockRecordRepository.class), mock(StockRecordService.class),
                mock(SupplierService.class), mock(NotificationService.class), props, audit);
    }

    private PurchaseOrder po(String poId, PoStatus status) {
        PurchaseOrder p = new PurchaseOrder(poId, SUPPLIER, status, LocalDate.now(), LocalDate.now().plusDays(7), null, null);
        when(poRepo.findById(poId)).thenReturn(Optional.of(p));
        supplierOrders.add(p);
        return p;
    }

    private PoLineItem line(String poId, String sku, String unitPrice, int qty) {
        Product product = new Product(sku, "Product " + sku, "General", new BigDecimal(unitPrice), 10, "pcs");
        return new PoLineItem(new PoLineItemId(poId, sku), null, product, qty, 0, null);
    }

    private void lines(String poId, PoLineItem... items) {
        when(lineRepo.findByIdPoId(poId)).thenReturn(List.of(items));
    }

    private User user(String userId, Role role) {
        User u = new User(userId, userId, userId.toLowerCase() + "@isms.test", role, "hash", UserStatus.ACTIVE);
        when(userRepo.findByUserId(userId)).thenReturn(Optional.of(u));
        return u;
    }

    /** An order of SUP-1 in {@code status} whose total is {@code amount}. */
    private PurchaseOrder otherOrder(String poId, PoStatus status, String amount) {
        PurchaseOrder p = po(poId, status);
        lines(poId, line(poId, "X-" + poId, amount, 1));
        return p;
    }

    private static ApiException assertApi(HttpStatus status, String code, Executable call) {
        ApiException e = assertThrows(ApiException.class, call);
        assertEquals(status, e.getStatus());
        assertEquals(code, e.getCode());
        return e;
    }

    private void assertApproved(PurchaseOrder p) {
        assertEquals(PoStatus.APPROVED, p.getStatus());
        verify(poRepo, times(1)).save(p);
    }

    @Test
    @DisplayName("UT3-01 calculatePoTotal of an order with no line items is 0")
    void ut3_01_emptyOrderTotalIsZero() {
        lines("PO-1");
        assertEquals(0, BigDecimal.ZERO.compareTo(service.calculatePoTotal("PO-1")));
    }

    @Test
    @DisplayName("UT3-02 calculatePoTotal sums unit price x quantity (2 x 150.50 + 3 x 99.99 = 600.97)")
    void ut3_02_orderTotal() {
        lines("PO-1", line("PO-1", "A", "150.50", 2), line("PO-1", "B", "99.99", 3));
        assertEquals(0, new BigDecimal("600.97").compareTo(service.calculatePoTotal("PO-1")));
    }

    @Test
    @DisplayName("UT3-03 supplier exposure counts only Pending, Approved and Partially Received orders")
    void ut3_03_exposureCountsOpenStatusesOnly() {
        int n = 1;
        for (PoStatus status : PoStatus.values()) {
            otherOrder("PO-S" + n++, status, "1000");
        }
        assertEquals(0, new BigDecimal("3000").compareTo(service.calculateSupplierExposure("SUP-1", "PO-NEW")));
    }

    @Test
    @DisplayName("UT3-04 supplier exposure excludes the order being approved")
    void ut3_04_exposureExcludesCurrentOrder() {
        otherOrder("PO-1", PoStatus.PENDING_APPROVAL, "1000");
        otherOrder("PO-2", PoStatus.PENDING_APPROVAL, "2000");
        assertEquals(0, new BigDecimal("2000").compareTo(service.calculateSupplierExposure("SUP-1", "PO-1")));
    }

    @Test
    @DisplayName("UT3-05 an unknown PO is rejected with 404 PO_NOT_FOUND and nothing is saved")
    void ut3_05_unknownPo() {
        user("MGR-1", Role.MANAGER);
        assertApi(HttpStatus.NOT_FOUND, "PO_NOT_FOUND", () -> service.approve("PO-404", "MGR-1"));
        verify(poRepo, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test
    @DisplayName("UT3-06 a Manager approves a Pending order of 10,000")
    void ut3_06_managerApprovesPending() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "1000", 10));
        User mgr = user("MGR-1", Role.MANAGER);
        service.approve("PO-1", "MGR-1");
        assertApproved(p);
        assertSame(mgr, p.getManager());
    }

    @Test
    @DisplayName("UT3-07 an Administrator can approve a Draft order (current behaviour, finding F-3)")
    void ut3_07_draftCanBeApproved() {
        PurchaseOrder p = po("PO-1", PoStatus.DRAFT);
        lines("PO-1", line("PO-1", "A", "500", 2));
        User adm = user("ADM-1", Role.ADMINISTRATOR);
        service.approve("PO-1", "ADM-1");
        assertApproved(p);
        assertSame(adm, p.getManager());
    }

    @Test
    @DisplayName("UT3-08 Approved, Partially Received, Received and Cancelled orders cannot be approved (409)")
    void ut3_08_illegalStartingStatus() {
        user("MGR-1", Role.MANAGER);
        PoStatus[] illegal = {PoStatus.APPROVED, PoStatus.PARTIALLY_RECEIVED, PoStatus.RECEIVED, PoStatus.CANCELLED};
        for (PoStatus status : illegal) {
            String poId = "PO-" + status.name();
            PurchaseOrder p = po(poId, status);
            lines(poId, line(poId, "A", "1000", 1));
            ApiException e = assertApi(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION",
                    () -> service.approve(poId, "MGR-1"));
            assertTrue(e.getMessage().contains(status.getValue()), e.getMessage());
            assertEquals(status, p.getStatus());
        }
        verify(poRepo, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test
    @DisplayName("UT3-09 Manager, total 99,999.99 (just below the limit) is approved")
    void ut3_09_managerBelowLimit() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "99999.99", 1));
        user("MGR-1", Role.MANAGER);
        service.approve("PO-1", "MGR-1");
        assertApproved(p);
    }

    @Test
    @DisplayName("UT3-10 Manager, total exactly 1,00,000 (on the limit) is approved")
    void ut3_10_managerOnLimit() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "100000.00", 1));
        user("MGR-1", Role.MANAGER);
        service.approve("PO-1", "MGR-1");
        assertApproved(p);
    }

    @Test
    @DisplayName("UT3-11 Manager, total 1,00,000.01 is rejected with 403 APPROVAL_LIMIT_EXCEEDED")
    void ut3_11_managerAboveLimit() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "100000.01", 1));
        user("MGR-1", Role.MANAGER);
        assertApi(HttpStatus.FORBIDDEN, "APPROVAL_LIMIT_EXCEEDED", () -> service.approve("PO-1", "MGR-1"));
        assertEquals(PoStatus.PENDING_APPROVAL, p.getStatus());
        verify(poRepo, never()).save(any());
        verifyNoInteractions(audit);
    }

    @Test
    @DisplayName("UT3-12 an Administrator is not bound by the Manager limit (3,00,000 approved)")
    void ut3_12_administratorNotLimited() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "300000", 1));
        user("ADM-1", Role.ADMINISTRATOR);
        service.approve("PO-1", "ADM-1");
        assertApproved(p);
    }

    @Test
    @DisplayName("UT3-13 projected exposure exactly 5,00,000 (on the credit limit) is approved")
    void ut3_13_creditOnLimit() {
        otherOrder("PO-2", PoStatus.APPROVED, "400000");
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "100000", 1));
        user("ADM-1", Role.ADMINISTRATOR);
        service.approve("PO-1", "ADM-1");
        assertApproved(p);
    }

    @Test
    @DisplayName("UT3-14 projected exposure 5,00,000.01 is rejected with 400 CREDIT_LIMIT_EXCEEDED")
    void ut3_14_creditAboveLimit() {
        otherOrder("PO-2", PoStatus.APPROVED, "400000.01");
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "100000", 1));
        user("ADM-1", Role.ADMINISTRATOR);
        assertApi(HttpStatus.BAD_REQUEST, "CREDIT_LIMIT_EXCEEDED", () -> service.approve("PO-1", "ADM-1"));
        assertEquals(PoStatus.PENDING_APPROVAL, p.getStatus());
        verify(poRepo, never()).save(any());
    }

    @Test
    @DisplayName("UT3-15 a Manager within his limit is still stopped by the supplier credit limit")
    void ut3_15_managerWithinLimitButCreditExceeded() {
        otherOrder("PO-2", PoStatus.PENDING_APPROVAL, "450000");
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "90000", 1));
        user("MGR-1", Role.MANAGER);
        assertApi(HttpStatus.BAD_REQUEST, "CREDIT_LIMIT_EXCEEDED", () -> service.approve("PO-1", "MGR-1"));
        assertEquals(PoStatus.PENDING_APPROVAL, p.getStatus());
        verify(poRepo, never()).save(any());
    }

    @Test
    @DisplayName("UT3-16 a null approver is approved as \"system\" and no manager is set")
    @SuppressWarnings("unchecked")
    void ut3_16_nullApprover() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "1000", 1));
        service.approve("PO-1", null);
        assertApproved(p);
        assertNull(p.getManager());
        ArgumentCaptor<Map<String, Object>> details = ArgumentCaptor.forClass(Map.class);
        verify(audit).log(eq("PO-1"), eq("PO_APPROVED"), eq("purchase_orders"), details.capture());
        assertEquals("system", details.getValue().get("approver"));
        verify(userRepo, never()).findByUserId(any());
    }

    @Test
    @DisplayName("UT3-17 an unknown approver skips the Manager limit and no manager is set")
    void ut3_17_unknownApprover() {
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "200000", 1));
        when(userRepo.findByUserId("GHOST")).thenReturn(Optional.empty());
        service.approve("PO-1", "GHOST");
        assertApproved(p);
        assertNull(p.getManager());
    }

    @Test
    @DisplayName("UT3-18 a successful approval writes exactly one PO_APPROVED audit entry")
    @SuppressWarnings("unchecked")
    void ut3_18_auditEntry() {
        po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "1000", 5));
        user("MGR-1", Role.MANAGER);
        service.approve("PO-1", "MGR-1");
        ArgumentCaptor<Map<String, Object>> details = ArgumentCaptor.forClass(Map.class);
        verify(audit, times(1)).log(eq("PO-1"), eq("PO_APPROVED"), eq("purchase_orders"), details.capture());
        verifyNoMoreInteractions(audit);
        assertEquals("MGR-1", details.getValue().get("approver"));
        assertEquals(0, new BigDecimal("5000").compareTo((BigDecimal) details.getValue().get("total_amount")));
    }

    @Test
    @DisplayName("UT3-19 with no limits configured any total is approved (99,99,999)")
    void ut3_19_noLimitsConfigured() {
        service = build(null, null);
        PurchaseOrder p = po("PO-1", PoStatus.PENDING_APPROVAL);
        lines("PO-1", line("PO-1", "A", "9999999", 1));
        user("MGR-1", Role.MANAGER);
        service.approve("PO-1", "MGR-1");
        assertApproved(p);
    }
}
