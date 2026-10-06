# ISMS Project Progress

## Phase Tracking

- [x] **P0 Setup**: Scaffolding, Docker Compose, Makefile, backend Spring Boot 3.3.5, frontend React + Vite, test tooling, health checks.
- [x] **P1 Schema + Auth (F1)**: Flyway `V1__init.sql` from `schema.md`, JPA entities (`ddl-auto=validate`), `SchemaMatchesSpecTest`, JWT auth, lockout (5 fails / 15m), sliding session timeout, password reset via Mailpit, RBAC matrix test, `ClassContractTest`.
- [x] **P2 Inventory (C1) + Notifications (F2)**: Product/Stock CRUD, row locking, WebSocket sync, voice interpretation and confirmation, low-stock notifications (`Seq1InventoryTest`).
- [x] **P3 Supplier + Purchase Orders (C2)**: Supplier CRUD, PO lifecycle, approvals, receipts, overdue detection (`Seq2PurchaseOrderTest`).
- [x] **P4 Sales (C3)**: Physical sale, webhook HMAC verification, stock deductions, PDF invoice generation, returns (`Seq3SalesTest`).
- [x] **P5 Forecast + Dashboards (E1)**: In-process Holt-Winters forecasting, reorder recommendations, analytics dashboards.
- [x] **P6 Admin + Polish (E2, E3)**: User/role management, marketplace simulation, contextual help, empty/error UI states.
- [x] **P7 Hardening + Docs**: Traceability matrix, NFR validation, final documentation and demo walkthrough verification.

---

### P7: Hardening + Docs Completed
- **Done**:
  - Implemented `PoStateMachineTest`: Validates legal 6-state transitions (`Draft` &rarr; `Pending Approval` &rarr; `Approved` &rarr; `Received`), rejection reverting to `Draft` with reason, and rejects illegal transition attempts with `ApiException`.
  - Implemented `NfrTest`:
    - `NFR PE-2`: Multi-channel inventory synchronization within 5-second latency threshold.
    - `NFR SE-1 / Auth.Lockout`: 5 consecutive failed login attempts activates 15-minute account lockout.
    - `NFR PE-3`: 100 concurrent voice interpretation requests executed across worker pools under 3.0s total.
    - `NFR Auth.Session.Timeout`: 30-minute sliding session JWT token generation and validation.
  - Created `docs/traceability.md`: Exhaustive Requirements Traceability Matrix (RTM) linking all SRS tags, business rules (BR-1..5), sequence diagrams (1..3), and NFRs directly to backend source files, REST endpoints, frontend components, and automated test cases.
  - Created `README.md`: Complete system architecture guide, quick-start commands (`make up/down/test`), seed credentials table, end-to-end role acceptance walkthrough script, and NFR benchmark instructions.
  - Full project test suite: All **56 backend tests** and frontend Vitest suites pass with 0 failures, 0 errors, 0 skipped.
- **Overall Project Status**: **100% Complete & Verified End-to-End**.
- **Known gaps**: None.

---

### P6: Admin + Polish (E2, E3) Completed
- **Done**:
  - Implemented `AdministratorService` & `UserController`:
    - User management: List users (`GET /api/v1/users`), Create user with BCrypt password hashing (`POST /api/v1/users`), RBAC Role Assignment (`PATCH /api/v1/users/{id}/role` calling `Administrator.assign_role`), and User activation / deactivation / account unlocking (`PATCH /api/v1/users/{id}/status`).
    - Unlocking an account resets consecutive failed attempts in `LoginAttemptCache`.
    - Supplier deactivation safeguards (`Administrator.deactivate_supplier` / `POST /api/v1/suppliers/{id}/deactivate`) with 409 Conflict if active or open POs exist (BR-5).
  - Implemented `SettingsController` (`GET /api/v1/settings`):
    - Exposes read-only global environment limits and thresholds: Manager approval limit ($50,000), Supplier credit exposure limit ($100,000), Lockout policy (5 fails / 15m), Session idle timeout (30m sliding), Voice recognition confidence (80%), Audio alert volume cap (80%), Storage path, and Tax rate.
  - Quality & Demo Tooling:
    - `scripts/simulate_marketplace.sh`: Executable CLI tool computing real HMAC-SHA256 signatures over marketplace order payloads and posting directly to `/api/v1/sales/webhook/{marketplace}`.
    - `scripts/load_test.sh`: Performance benchmark testing concurrent requests, calculating p95 latency and verifying PE-1 / PE-3 compliance.
  - Tests:
    - `AdminTest`: 3 tests passing:
      1. User creation, status updates, unlocking, and duplicate ID prevention.
      2. Role assignment across RBAC spectrum.
      3. User directory listing.
    - Total test suite: 49/49 backend tests passing, frontend Vitest passing.
  - Frontend:
    - `UsersPage.tsx`: User Directory with role filter and search, Add User modal with inline form validation (UI-4), Change Role modal (E2.2), Activate/Deactivate/Unlock actions (E2.1), Read-Only System Configuration cards (E2.4), and Interactive Role Onboarding Guide modal (UD-1, UD-2).
    - Registered `/users` route in `App.tsx` and sidebar.
- **Next**:
  - Phase P7: Hardening + Docs — NFR validation tests, final comprehensive `docs/traceability.md` mapping SRS tags &rarr; implementation files &rarr; test classes, walkthrough demo verification, and final cleanup.
- **Known gaps**:
  - None for P6. Ready for Phase P7.

---

### P5: Forecast + Dashboards (E1) Completed
- **Done**:
  - Implemented `ForecastService`:
    - Hand-written in-process Holt-Winters additive exponential smoothing algorithm ($\alpha=0.2$, $\beta=0.1$, $\gamma=0.2$, $m=7$) with seasonal-naive fallback when data series $< 14$ days.
    - Demand forecasting (`Forecast.generateDemand`) per SKU/location, storing predictions in `forecasts` composite table `(sku_id, location_id, forecast_period)`.
    - Seasonality detection (`Forecast.detectSeasonality`) identifying weekly/daily cycles.
    - Reorder recommendations (`Forecast.recommendReorder`) incorporating supplier lead time, demand forecasts, safety buffers, and current stock on hand.
    - Automated 1-Click Purchase Order draft generator (`Forecast.Reorder.Suggest` / `getReorderSuggestions()`) providing pre-filled PO payloads for SKUs near or below reorder thresholds.
    - Revenue analytics (`getRevenueAnalytics`): groups revenue and order count by channel (`In-Store`, `Amazon`, `Shopify`, etc.), warehouse location, or date period, computing total gross revenue and average order value (AOV).
    - Stock analytics (`getStockAnalytics`): classifies inventory into low-stock, out-of-stock, and overstock ($> 3\times$ threshold), and calculates total units and inventory valuation.
    - Scheduled background job support (`@Scheduled(cron = "${isms.forecast.cron}")`) and on-demand trigger.
  - REST API Controllers:
    - `ForecastController` (`/api/v1/forecast`, `/api/v1/forecast/run`, `/api/v1/forecast/reorder-suggestions`).
    - `AnalyticsController` (`/api/v1/analytics/revenue`, `/api/v1/analytics/stock`).
  - Tests:
    - `ForecastTest`: 3 tests passing:
      1. Complete forecast pipeline execution asserted with `CallTrace` order: `ForecastService.generateDemand` &rarr; `ForecastService.detectSeasonality` &rarr; `ForecastService.recommendReorder`.
      2. Reorder suggestions accurately detect stock $\le$ reorder point and generate pre-filled PO draft payloads.
      3. Stock analytics returns verified unit counts, product metrics, and inventory valuations.
    - Total test suite: 46/46 backend tests passing, frontend smoke test passing.
  - Frontend:
    - `ForecastPage.tsx`: Interactive dashboard featuring:
      - Demand Forecasts table with search filters and seasonality badges.
      - 1-Click Reorder Suggestions cards with stock deficit meters and direct "Create Draft PO" triggers.
      - Revenue Analytics dashboard with group-by toggles (Channel, Location, Date), stat cards, and percentage distribution bars.
      - Stock & Inventory view featuring inventory valuation, low stock alert tables, and overstock monitors.
    - Routed `/forecast` in `App.tsx` and navbar.
- **Next**:
  - Phase P6: Admin + Polish (E2, E3) — User administration (list, create, deactivate user, role assignment, unlock locked users), supplier deactivation safeguards UI, system settings screen (read-only), onboarding guide / contextual help (UD-1, UD-2), inline form validation, and standalone marketplace simulation CLI script (`scripts/simulate_marketplace.sh`).
- **Known gaps**:
  - None for P5. Ready for Phase P6.

---

### P4: Process Sales (C3) Completed
- **Done**:
  - Implemented `SalesPersonnelService.logPhysicalSale`: pre-checks product catalogue per Sequence 3 trace, creates order via `SalesOrderService.createOrder`.
  - Implemented `SalesOrderService`:
    - Physical sale workflow with atomic stock deduction via `StockRecordService.deductStock()` under pessimistic row lock (`PESSIMISTIC_WRITE`).
    - OpenPDF invoice generation to `storage/invoices/{order_id}.pdf` with layout containing header, order ID, payment method, line items breakdown, total due, and company info.
    - Idempotent marketplace webhook ingest (`POST /api/v1/sales/webhook/{marketplace}`) verifying HMAC-SHA256 signatures via `X-Signature` header against configurable channel secret (`ISMS_MARKETPLACE_WEBHOOK_SECRET`).
    - Handled marketplace event types: `order-created`, `order-paid`, `order-cancelled`, `order-returned`.
    - Returns workflow (`processReturn`): reverses inventory levels via `StockRecordService.updateStock` and transitions order status to `Returned`.
    - Developer simulation endpoint (`POST /api/v1/dev/simulate-marketplace-order`) for demo and automated testing.
  - REST API controllers: `SalesController` (`/api/v1/sales`, `/api/v1/sales/physical`, `/api/v1/sales/webhook/{marketplace}`, `/api/v1/sales/{id}/return`, `/api/v1/sales/{id}/invoice`, `/api/v1/dev/simulate-marketplace-order`).
  - Tests:
    - `Seq3SalesTest`: 4 tests passing:
      1. Sequence 3 message order verified via `CallTraceAspect` (`SalesPersonnel.logPhysicalSale` -> `Product.search` -> `SalesOrder.createOrder` -> `StockRecord.deductStock` -> `SalesOrder.generateInvoice`).
      2. Insufficient stock rejection prevents order creation and preserves stock levels.
      3. Order return workflow verified (`SalesOrder.processReturn` -> `StockRecord.updateStock`).
      4. Generated OpenPDF invoice file exists on filesystem, is non-empty, and valid PDF.
    - `WebhookSecurityTest`: 4 tests passing:
      1. Valid HMAC-SHA256 signature accepted with 200/201 and stock deducted.
      2. Invalid signature rejected with 401 Unauthorized.
      3. Missing signature rejected with 401 Unauthorized.
      4. Duplicate webhook delivery handled idempotently without double-deduction.
  - Frontend:
    - `SalesPage.tsx`: POS terminal with barcode-wedge / product search input, cart management, checkout with payment method selection, order history table, return order modal with per-item quantity restock, and interactive marketplace webhook HMAC simulator with JSON payload viewer.
    - Integrated `/sales` route in `App.tsx` and navbar.
  - Full suite passes: `make test` runs 43 backend tests and frontend Vitest with 0 failures.
- **Next**:
  - Phase P5: Forecast + Dashboards (E1) — In-process Holt-Winters additive exponential smoothing algorithm with seasonal-naive fallback, reorder recommendations (`/forecast/reorder-suggestions`), analytics endpoints (`/analytics/revenue`, `/analytics/stock`), and visual charts in frontend.
- **Known gaps**:
  - None for P4. Ready for Phase P5.

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
