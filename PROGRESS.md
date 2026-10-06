# ISMS Project Progress

## Phase Tracking

- [x] **P0 Setup**: Scaffolding, Docker Compose, Makefile, backend Spring Boot 3.3.5, frontend React + Vite, test tooling, health checks.
- [x] **P1 Schema + Auth (F1)**: Flyway `V1__init.sql` from `schema.md`, JPA entities (`ddl-auto=validate`), `SchemaMatchesSpecTest`, JWT auth, lockout (5 fails / 15m), sliding session timeout, password reset via Mailpit, RBAC matrix test, `ClassContractTest`.
- [x] **P2 Inventory (C1) + Notifications (F2)**: Product/Stock CRUD, row locking, WebSocket sync, voice interpretation and confirmation, low-stock notifications (`Seq1InventoryTest`).
- [x] **P3 Supplier + Purchase Orders (C2)**: Supplier CRUD, PO lifecycle, approvals, receipts, overdue detection (`Seq2PurchaseOrderTest`).
- [ ] **P4 Sales (C3)**: Physical sale, webhook HMAC verification, stock deductions, PDF invoice generation, returns (`Seq3SalesTest`).
- [ ] **P5 Forecast + Dashboards (E1)**: In-process Holt-Winters forecasting, reorder recommendations, analytics dashboards.
- [ ] **P6 Admin + Polish (E2, E3)**: User/role management, marketplace simulation, contextual help, empty/error UI states.
- [ ] **P7 Hardening + Docs**: Traceability matrix, NFR validation, final documentation and demo walkthrough verification.

---

### P3: Supplier + Purchase Orders (C2) Completed
- **Done**:
  - Implemented `SupplierService`: create, edit, search ranked by rating, and `trackPerformance` (BR-4: rating recalculation clamped to [0.00, 5.00] and procurement history audit trail).
  - Implemented `PurchaseOrderService`: 6-state lifecycle (`Draft`, `Pending Approval`, `Approved`, `Partially Received`, `Received`, `Cancelled`), multi-tier approval rules (`APPROVAL_LIMIT_MANAGER` enforcement on Manager, unlimited on Admin), supplier credit limit check (`SUPPLIER_CREDIT_LIMIT` on total open exposure), partial/full receipt confirmation with stock increment via `StockRecordService.updateStock`, and overdue PO detection with shipping delay alert triggers.
  - Implemented `ManagerService.approvePo` and `rejectPo` (rejection reason notified to manager, status reverted to Draft per D8).
  - Implemented `WarehouseStaffService.receivePoConfirm` delegating to `PurchaseOrderService.receiveConfirm` and updating stock and supplier ratings.
  - REST API controllers: `SupplierController` (`/api/v1/suppliers`), `PurchaseOrderController` (`/api/v1/purchase-orders`).
  - Tests:
    - `Seq2PurchaseOrderTest`: 7 comprehensive tests passing:
      1. Sequence 2 message order asserted via `CallTraceAspect` (Supplier.search -> Product.search -> PO.create -> Manager.approvePo -> PO.approve -> WarehouseStaff.receivePoConfirm -> PO.receiveConfirm -> Supplier.trackPerformance).
      2. Rejection branch asserted (Manager.rejectPo -> PO.reject -> reverted to Draft).
      3. Overdue detection asserted (PO.flagOverdue -> Notification.triggerShippingDelay).
      4. BR-2 Manager approval limit check (exceeded fails with 403, Admin succeeds).
      5. BR-2 Supplier credit limit check (exceeded fails with 400 for both).
      6. Partial receipt transitions (`Partially Received` -> `Received`).
      7. BR-5 Supplier deactivation check (blocked with open POs, succeeds after cancellation).
  - Frontend:
    - `SuppliersPage`: Vendor directory, rating filter, add/edit supplier modal, procurement history viewer, and deactivation action.
    - `PurchaseOrdersPage`: Status-based filter tabs, create PO draft modal, submit/approve/reject/cancel/receive modal actions, line items breakdown, and overdue indicator.
    - Routes integrated in `App.tsx`.
  - Full suite passes: `./mvnw test` (35 tests green) and `npm run build && npm test`.
- **Next**:
  - Phase P4: Process Sales (C3) — Physical sale logging (`SalesPersonnel.logPhysicalSale`), sales order lifecycle, barcode-wedge compatibility, stock deduction under concurrency (`deductStock`), mock payment gateway, OpenPDF invoice generation (`storage/invoices/{order_id}.pdf`), marketplace webhook handler with HMAC-SHA256 signature verification (`X-Signature`), idempotency, returns (`processReturn`), and `Seq3SalesTest`.
- **Known gaps**:
  - None for P3. Ready for Phase P4.
