# ISMS Project Progress

## Phase Tracking

- [x] **P0 Setup**: Scaffolding, Docker Compose, Makefile, backend Spring Boot 3.3.5, frontend React + Vite, test tooling, health checks.
- [x] **P1 Schema + Auth (F1)**: Flyway `V1__init.sql` from `schema.md`, JPA entities (`ddl-auto=validate`), `SchemaMatchesSpecTest`, JWT auth, lockout (5 fails / 15m), sliding session timeout, password reset via Mailpit, RBAC matrix test, `ClassContractTest`.
- [x] **P2 Inventory (C1) + Notifications (F2)**: Product/Stock CRUD, row locking, WebSocket sync, voice interpretation and confirmation, low-stock notifications (`Seq1InventoryTest`).
- [ ] **P3 Supplier + Purchase Orders (C2)**: Supplier CRUD, PO lifecycle, approvals, receipts, overdue detection (`Seq2PurchaseOrderTest`).
- [ ] **P4 Sales (C3)**: Physical sale, webhook HMAC verification, stock deductions, PDF invoice generation, returns (`Seq3SalesTest`).
- [ ] **P5 Forecast + Dashboards (E1)**: In-process Holt-Winters forecasting, reorder recommendations, analytics dashboards.
- [ ] **P6 Admin + Polish (E2, E3)**: User/role management, marketplace simulation, contextual help, empty/error UI states.
- [ ] **P7 Hardening + Docs**: Traceability matrix, NFR validation, final documentation and demo walkthrough verification.

---

### P2: Inventory (C1) + Notifications (F2) Completed
- **Done**:
  - Implemented `ProductService` with search (name/category/SKU), `addProduct`, `editProduct`, and guarded `deleteProduct` (D7: fails if stock > 0, soft-deactivates).
  - Implemented `StockRecordService` with `@Lock(LockModeType.PESSIMISTIC_WRITE)` preventing negative stock (BR-3), low-stock reorder detection, and real-time sync dispatch.
  - Built real-time WebSockets: `StockWebSocketHandler` on `/ws/stock` and `AlertWebSocketHandler` on `/ws/alerts`.
  - Built outbound channel adapters (`ChannelAdapter`) and stubs (`StubChannelAdapters`).
  - Implemented `VoiceInterpreter` deterministic grammar parser (`add|remove|set|check <n> [units of] <sku> [to|from|in] [location] <loc>`), with confidence thresholding (< 0.85 requires re-dictation) and confirmation token generation.
  - Implemented `WarehouseStaffService.captureVoiceCommand`, `confirmVoiceCommand`, and `replayOfflineQueue`.
  - REST API controllers: `ProductController`, `StockController`, `VoiceController`, `NotificationController`.
  - Tests:
    - `VoiceInterpreterTest`: unit tests for valid commands, variants, and rejection of invalid formats.
    - `StockConcurrencyTest`: 10 concurrent threads deducting stock under pessimistic locking, proving zero overselling / negative stock.
    - `Seq1InventoryTest`: sequence integration test verifying exact message sequence on `CallTraceAspect` (captureVoiceCommand -> updateStock -> realtimeSync -> sendAudioAlert).
  - Frontend:
    - `InventoryPage`: Live product table, stock adjustment modal, real-time WebSocket updates, low-stock alerts.
    - `VoiceCommandPage`: Web Speech STT/TTS audio synthesis, microphone recording, confirmation prompt, typed command fallback box (CO-4), offline queueing and replay.
    - `NotificationsPage`: Real-time `/ws/alerts` notification stream and mark-as-read.
    - Integrated routes into `App.tsx` and updated `Layout.tsx`.
- **Next**:
  - Phase P3: Supplier + Purchase Orders (C2) — Supplier CRUD and rating/on-time performance tracking, PurchaseOrder 6-state lifecycle (`Draft`, `Pending Approval`, `Approved`, `Partially Received`, `Received`, `Cancelled`), multi-tier approval rules (`APPROVAL_LIMIT_MANAGER`), supplier credit limit checks (`SUPPLIER_CREDIT_LIMIT`), receipt confirmation updating stock, scheduled hourly overdue check (`triggerShippingDelay`), and `Seq2PurchaseOrderTest`.
- **Known gaps**:
  - None for P2. Ready for Phase P3.
