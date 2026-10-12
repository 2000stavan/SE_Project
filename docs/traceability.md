# ISMS Requirements Traceability Matrix (RTM)

Maps every requirement of the SRS (`moodle/moodle.md` Document A) to the use case, UML class, sequence diagram, DFD process, implementation and automated test. The module numbers are the eight delivery modules of `github.md`.

Sources: SRS = `moodle/moodle.md` §A · Use cases = §B · Class diagram = §C (`docs/class-diagram-mapping.md`) · Sequence diagrams = §D (SD-1 Inventory, SD-2 Purchase Order, SD-3 Sales) · DFD = §F.

**DFD processes (Level 1):** 1.0 Authenticate User · 2.0 Manage Users, Suppliers & Settings · 3.0 Process Sales Order · 4.0 Manage Inventory Operations · 5.0 Forecast Demand · 6.0 Manage Purchase Orders · 7.0 Monitor Stock & Notify.
**DFD data stores:** D1 User · D2 Supplier · D3 Product · D4 Stock Record · D5 Sales Order · D6 Forecast · D7 Purchase Order · D8 Notification.

---

## 1. Module overview

| Module | SRS feature | Use cases (§B) | Classes (§C) | Sequence | DFD |
|---|---|---|---|---|---|
| 1 | 4.1 Authentication & RBAC | Manage Users and Roles, View Audit Logs (Administrator) | `User`, `Administrator` | – | 1.0, 2.0 · D1 |
| 2 | 4.2 Voice-Enabled Inventory & Omnichannel Sync | Manage Inventory (Add/Update/Adjust/Delete/Search Stock), Voice Command | `Product`, `StockRecord`, `WarehouseStaff` | SD-1 | 4.0 · D3, D4 |
| 3 | 4.3 Supplier Management | Manage Suppliers | `Supplier` | SD-2 (first messages) | 2.0 · D2 |
| 4 | 4.4 Purchase Order Management | Manage Purchase Order | `PurchaseOrder`, `Manager`, `WarehouseStaff` | SD-2 | 6.0 · D7 |
| 5 | 4.5 Sales Tracking & Order Management | Process Sales Order, Process Returns/Cancellations | `SalesOrder`, `SalesPersonnel` | SD-3 | 3.0 · D5 |
| 6 | 4.6 Predictive Analytics & AI Forecasting | Generate Demand Forecast, View Analytics Dashboard | `Forecast` | – | 5.0 · D6 |
| 7 | 4.7 Multimodal Notification System | Low Stock Alert, Shipping Delay Alert (extend Manage Inventory / PO) | `Notification` | SD-1 `alt`, SD-2 `opt` | 7.0 · D8 |
| 8 | NFRs, business rules, demo data, documentation | – | – | – | – |

---

## 2. Module 1 — Authentication & RBAC (SRS 4.1)

| SRS tag | Requirement | Class operation | Implementation | REST | UI | Test |
|---|---|---|---|---|---|---|
| `Auth.Login` | Authenticate before any function other than login (SE-2) | `User.login()` | `UserService.login`, `JwtService`, `JwtAuthFilter` | `POST /auth/login` | `LoginPage` | `AuthIntegrationTest.testLoginAllFourRoles`, `RbacMatrixTest` |
| `Auth.Login.Fail` | Generic error; lock after 5 failures in 15 min; **locked status persisted** so the Administrator sees and unlocks it | `User.login()` | `LoginAttemptCache`, `UserService.login` (`noRollbackFor`) | `POST /auth/login`, `PATCH /users/{id}/status` | `LoginPage`, `UsersPage` | `AuthIntegrationTest.testAccountLockoutAfterFiveFailedAttempts`, `…testLockIsPersistedAndAdminCanUnlock`, `NfrTest.testFailedLoginLockout` |
| `Auth.Password.Reset` | Reset via verified e-mail, single-use, 30 min | `User.reset_password()` | `UserService.resetPassword`, `SmtpMailerAdapter` | `POST /auth/password-reset/request`, `/confirm` | `PasswordResetPage` | `AuthIntegrationTest.testPasswordResetFlow` |
| `Auth.RBAC.Roles` | Four roles with distinct permissions | generalization of `User` | `Role` enum, `@PreAuthorize`, `SecurityConfig` | all `/api/v1/**` | role-aware `Layout`, `RoleGuard` | `RbacMatrixTest.testUserAdminAccessMatrix`, `ClassDiagramStructureTest` |
| `Auth.RBAC.Assign` | Administrator changes a role | `Administrator.assign_role()` | `AdministratorService.assignRole` | `PATCH /users/{id}/role` | `UsersPage` | `AdminTest.testAssignRole` |
| `Auth.RBAC.Enforce` | Every function restricted to the role (SE-3); 401 unauthenticated, 403 wrong role | – | `SecurityConfig` entry-point + access-denied handler | all | `RoleGuard` (“Access Restricted”) | `RbacMatrixTest`, `scripts/smoke_test.sh` |
| `Auth.Session.Timeout` | Log out after 30 min inactivity | – | sliding token: `JwtService.refreshToken`, `X-Refreshed-Token` | all | `client.ts`, `AuthContext` | `AuthIntegrationTest.testSlidingTokenHeader`, `NfrTest.testSlidingSessionTokenRenewal` |
| `Auth.Audit.Log` / SE-5 | Timestamped log of logins, logouts, role changes (and stock/PO/sales) | – | `AuditLogger` (JSON log + 1000-event buffer) | `GET /admin/audit-log` | `AuditLogPage` | `AdminTest`, `scripts/smoke_test.sh` |
| (Administrator) | Create / activate / deactivate / unlock users; read system settings | – | `AdministratorService`, `UserController`, `SettingsController` | `GET/POST /users`, `GET /settings` | `UsersPage` | `AdminTest.testUserCrudAndUnlock`, `…testListUsers` |
| UI-1, UI-2 | Role dashboards on one design system; persistent help link | – | – | – | `DashboardPage`, `Layout`, `OnboardingModal`, `ThemeToggle` | UI inspection |
| UD-1, UD-2 | Onboarding for first-time users | – | – | – | `OnboardingModal`, role guide | UI inspection |

## 3. Module 2 — Voice-Enabled Inventory & Omnichannel Sync (SRS 4.2)

| SRS tag | Requirement | Class operation | Implementation | REST / WS | UI | Test |
|---|---|---|---|---|---|---|
| `Inventory.CRUD.Create` | Create SKU (name, category, unit, price, reorder point) | `Product.create()` | `ProductService.create` (+ initial `StockRecord`) | `POST /products` | `InventoryPage` | `Seq1InventoryTest`, `scripts/smoke_test.sh` |
| `Inventory.CRUD.Update` | Update quantity / attributes | `Product.update()`, `StockRecord.update_stock()` | `ProductService.update`, `StockRecordService.updateStock` | `PATCH /products/{sku}`, `PUT /stock/{sku}/{loc}` | `InventoryPage` (Edit, Adjust) | `Seq1InventoryTest` |
| `Inventory.CRUD.Delete` | Deactivate only when quantity is zero everywhere | `Product.delete()` | `ProductService.delete` → 409 `STOCK_EXISTS` | `DELETE /products/{sku}` | `InventoryPage` (Delete) | `Seq1InventoryTest`, `scripts/smoke_test.sh` |
| `Inventory.Search` | Filter by SKU, category, location, quantity range | `Product.search()` | `ProductService.search`, `StockRecordRepository.searchStock` | `GET /products`, `GET /stock` | `InventoryPage` | `Seq1InventoryTest` |
| `Voice.Command.Capture` | Capture speech → text | `WarehouseStaff.capture_voice_command()` | browser Web Speech API + `WarehouseStaffService.captureVoiceCommand` | `POST /voice/command` | `VoiceCommandPage` | `VoiceInterpreterTest`, `Seq1InventoryTest` |
| `Voice.Command.Interpret` | Parse action, SKU, quantity, location | – | `VoiceInterpreter` | `POST /voice/command` | `VoiceCommandPage` | `VoiceInterpreterTest.testStandardCommandNumeric`, `…testWordNumbers` |
| `Voice.Command.Confirm` | Read back, require confirmation (UI-3 state indicator) | – | `WarehouseStaffService` token + confirm | `POST /voice/confirm` | `VoiceCommandPage` | `VoiceInterpreterTest.testHighConfidenceConfirmation` (status `needs_confirmation`) |
| `Voice.Command.LowConfidence` | Below threshold: repeat or use the form | – | `isms.voice.confidence-threshold` | `POST /voice/command` | `VoiceCommandPage` | `VoiceInterpreterTest.testLowConfidenceThreshold` |
| `Sync.Channel.Realtime` (PE-2) | Push stock changes to channels within 5 s | `StockRecord.realtime_sync()` | `StockRecordService.realtimeSync`, `StockWebSocketHandler`, `StubChannelAdapters` | `WS /ws/stock` | `InventoryPage` (LIVE badge) | `NfrTest.testStockSyncLatency` |
| `Sync.Channel.Conflict` / BR-3 | Last unit goes to the first confirmed transaction; stock never below 0 | `StockRecord.deduct_stock()` | row lock `PESSIMISTIC_WRITE` + `em.refresh`; DB `CHECK (quantity_on_hand >= 0)` | `POST /sales/physical`, `POST /stock/adjust` | – | `StockConcurrencyTest`, `SalesConcurrencyTest.lastUnitIsSoldOnce` |
| Robustness-1 | Queue voice commands offline, replay | – | idempotent by `client_id` | `POST /voice/command/queued` | `VoiceCommandPage` (Offline Queue) | UI inspection |
| PE-1 (voice) | 100 concurrent commands in ≤ 3 s | – | `VoiceInterpreter` (stateless) | – | – | `NfrTest.testConcurrentVoiceInterpretationThroughput` |

## 4. Module 3 — Supplier Management (SRS 4.3)

| SRS tag | Requirement | Class operation | Implementation | REST | UI | Test |
|---|---|---|---|---|---|---|
| `Supplier.Create` / `.Edit` | Manager or Administrator creates / edits profiles | `Supplier.create()`, `edit()` | `SupplierService` | `POST /suppliers`, `PATCH /suppliers/{id}` | `SuppliersPage` | `ClassContractTest`, `scripts/smoke_test.sh` |
| `Supplier.Search` | By name, category, rating (ranked) | `Supplier.search()` | `SupplierService.search` | `GET /suppliers` | `SuppliersPage` | `Seq2PurchaseOrderTest.testSequence2ApprovalAndReceiptBranch` |
| `Supplier.Performance.Track` / BR-4 | Rating recalculated only when a PO is `Received` or `Cancelled` | `Supplier.track_performance()` | `SupplierService.trackPerformance` | – | – | `Seq2PurchaseOrderTest` |
| `Supplier.Performance.View` | History, timeliness | – | `SupplierService.getSupplierHistory` | `GET /suppliers/{id}/history`, `/performance` | `SuppliersPage` (history modal) | `scripts/smoke_test.sh` |
| `Supplier.Deactivate` / BR-5 | Administrator only, no open POs | `Administrator.deactivate_supplier()` | `AdministratorService.deactivateSupplier` | `POST /suppliers/{id}/deactivate` | `SuppliersPage` | `Seq2PurchaseOrderTest.testDeactivateSupplierBlockedWithOpenPos`, `AdminTest` |

## 5. Module 4 — Purchase Order Management (SRS 4.4)

| SRS tag | Requirement | Class operation | Implementation | REST | UI | Test |
|---|---|---|---|---|---|---|
| `PO.Create` / BR-1 | Manager/Administrator creates a PO | `PurchaseOrder.create()` | `PurchaseOrderService.create` | `POST /purchase-orders` | `PurchaseOrdersPage` | `Seq2PurchaseOrderTest.testSequence2ApprovalAndReceiptBranch` |
| `PO.Status.Track` | Six states, legal transitions only | – | `PoStatus`, state checks in service | `GET /purchase-orders` | `PurchaseOrdersPage` | `PoStateMachineTest` (3) |
| `PO.Approve` / BR-2 | Approval within manager limit; supplier credit limit | `Manager.approve_po()`, `PurchaseOrder.approve()` | `ManagerService.approvePo`, `PurchaseOrderService.approve` | `POST /purchase-orders/{id}/approve` | `PurchaseOrdersPage` | `Seq2PurchaseOrderTest.testManagerApprovalLimitEnforced`, `…testSupplierCreditLimitEnforced` |
| `PO.Approve.Reject` | Reject with a reason → back to Draft, creator notified | `Manager.reject_po()`, `PurchaseOrder.reject()` | `ManagerService.rejectPo` | `POST /purchase-orders/{id}/reject` | `PurchaseOrdersPage` | `Seq2PurchaseOrderTest.testSequence2RejectionBranch` |
| `PO.Receive.Confirm` / `.Partial` | Receipt per line, partial supported | `WarehouseStaff.receive_po_confirm()`, `PurchaseOrder.receive_confirm()` | `WarehouseStaffService.receivePoConfirm` | `POST /purchase-orders/{id}/receive` | `PurchaseOrdersPage` | `Seq2PurchaseOrderTest.testPartialReceiptWorkflow` |
| `PO.Receive.StockUpdate` | Increase stock on receipt | `StockRecord.update_stock()` | `StockRecordService.updateStock` | – | `InventoryPage` | `Seq2PurchaseOrderTest` |
| `PO.Overdue.Flag` | Flag overdue POs (hourly job) | `PurchaseOrder.flag_overdue()` | `PurchaseOrderService.flagOverdue` (`@Scheduled`) | `GET /purchase-orders/overdue` | `PurchaseOrdersPage` | `Seq2PurchaseOrderTest.testSequence2OverdueBranch` |

## 6. Module 5 — Sales Tracking & Order Management (SRS 4.5)

| SRS tag | Requirement | Class operation | Implementation | REST | UI | Test |
|---|---|---|---|---|---|---|
| `Sales.Physical.Log` | Log a physical sale (scan / select) | `SalesPersonnel.log_physical_sale()` | `SalesPersonnelService` | `POST /sales/physical` | `SalesPage` (POS) | `Seq3SalesTest.testSequence3PhysicalSaleProcessed` |
| `Sales.Order.Create` | Order with channel, lines, status | `SalesOrder.create_order()` | `SalesOrderService.createOrder` | `GET /sales`, `GET /sales/{id}` | `SalesPage` (history) | `Seq3SalesTest` |
| `Sales.Stock.Deduct` / BR-3 | Deduct on confirmation, never below 0 | `StockRecord.deduct_stock()` | `StockRecordService.deductStock` | – | – | `Seq3SalesTest`, `SalesConcurrencyTest` |
| `Sales.Stock.Insufficient` | Reject the line, **keep a REJECTED order**, notify the Manager | – | `SalesOrderService.recordRejectedOrder` (`REQUIRES_NEW`) | `POST /sales/physical` → 409 | `SalesPage` | `Seq3SalesTest.testSequence3InsufficientStockRejectedBranch` |
| `Invoice.Generate` | PDF invoice with items, quantities, prices, tax | `SalesOrder.generate_invoice()` | `SalesOrderService.generateInvoice` (OpenPDF) | `GET /sales/{id}/invoice` | `SalesPage` (Invoice PDF) | `Seq3SalesTest.testSequence3PhysicalSaleProcessed` |
| `Sales.Webhook.Receive` / `.Validate` (PE-3) | `order-created/paid/cancelled/returned`; HMAC-SHA256 verification | `SalesOrder.process_webhook()` | `SalesOrderService.processWebhook` | `POST /sales/webhook/{marketplace}` | `SalesPage` (Simulator) | `WebhookSecurityTest` (4), `Seq3SalesTest.testSequence3WebhookSaleProcessed` |
| (idempotency) | Replayed events change nothing | – | order id = marketplace id | same | – | `WebhookSecurityTest.testReplayEventIsIdempotent` |
| `Sales.Return.Process` | Restore stock | `SalesOrder.process_return()` | `SalesOrderService.processReturn` | `POST /sales/{id}/return` | `SalesPage` (return) | `Seq3SalesTest.testSequence3ReturnBranch` |
| `Sales.Order.View` | Filter by channel, date, status | – | `SalesOrderRepository.filterOrders` | `GET /sales?channel=&status=&from=&to=` | `SalesPage` | `scripts/smoke_test.sh` |

## 7. Module 6 — Predictive Analytics & AI Forecasting (SRS 4.6)

| SRS tag | Requirement | Class operation | Implementation | REST | UI | Test |
|---|---|---|---|---|---|---|
| `Forecast.Demand.Generate` (PE-4) | Forecast per SKU on a schedule | `Forecast.generate_demand()` | `ForecastService` (Holt-Winters, seasonal-naive fallback), `@Scheduled` | `POST /forecast/run`, `GET /forecast` | `ForecastPage` | `ForecastTest.testForecastPipelineAndContractCalls` |
| `Forecast.Seasonality.Detect` | Weekly / monthly cycles | `Forecast.detect_seasonality()` | `ForecastService.detectSeasonality` | `GET /forecast` | `ForecastPage` | `ForecastTest` |
| `Forecast.Reorder.Recommend` | Reorder point / quantity from demand and lead time | `Forecast.recommend_reorder()` | `ForecastService.recommendReorder` | `GET /forecast` | `ForecastPage` | `ForecastTest` |
| `Forecast.Reorder.Suggest` | Pre-filled PO draft | – | `ForecastService.getReorderSuggestions` | `GET /forecast/reorder-suggestions` | `ForecastPage` (Create Draft PO) | `ForecastTest.testReorderSuggestionsAndPoPayload` |
| `Forecast.Accuracy.Track` | Forecast vs actual per SKU | – | `SaleRecordedEvent` → `ForecastService.onSaleRecorded` | `GET /forecast/accuracy` | `ForecastPage` (Accuracy) | `scripts/smoke_test.sh` (endpoint); data produced by `Seq3SalesTest` sales |
| `Analytics.Dashboard.Revenue` | By channel / location / period | – | `ForecastService.getRevenueAnalytics` | `GET /analytics/revenue` | `ForecastPage`, `DashboardPage` | `ForecastTest` |
| `Analytics.Dashboard.Stock` | Low / out of / overstock | – | `ForecastService.getStockAnalytics` | `GET /analytics/stock` | `ForecastPage`, `DashboardPage` | `ForecastTest.testStockAnalytics` |

## 8. Module 7 — Multimodal Notification System (SRS 4.7)

| SRS tag | Requirement | Class operation | Implementation | REST / WS | UI | Test |
|---|---|---|---|---|---|---|
| `Notify.LowStock.Trigger` | Alert when stock < reorder point | `Notification.trigger_low_stock()` | `NotificationService.triggerLowStock` (called by `StockRecordService`) | `GET /notifications` | `NotificationsPage` | `Seq1InventoryTest.testSequence1WithLowStockAlert` |
| `Notify.ShippingDelay.Trigger` | Alert for an overdue PO | `Notification.trigger_shipping_delay()` | `NotificationService.triggerShippingDelay` | `GET /notifications` | `NotificationsPage` | `Seq2PurchaseOrderTest.testSequence2OverdueBranch` |
| `Notify.Channel.EmailSMS` (CI-1) | E-mail and SMS to configured recipients | – | `NotificationService`, `SmtpMailerAdapter` (SMTP), `StubChannelAdapters` (SMS stub) | – | – | e-mail captured by an SMTP sink in the manual tests; notification rows checked by `scripts/smoke_test.sh` |
| `Notify.Channel.Audio` (CI-2, SA-2) | Speech alert with a volume ceiling | `Notification.send_audio_alert()` | `NotificationService.sendAudioAlert`, `AlertWebSocketHandler`, `isms.audio-alert-max-volume` | `WS /ws/alerts` | `NotificationsPage` (live) | `Seq1InventoryTest.testSequence1WithLowStockAlert` |
| `Notify.Preferences.Configure` | Choose alert types and channels | – | `NotificationPreference` | `GET/PUT /notifications/preferences` | `NotificationPreferencesPage` | `scripts/smoke_test.sh` |
| `Notify.Log` | Every notification logged with status | – | `Notification` rows (one per recipient and channel), `PATCH /notifications/{id}/read` | `GET /notifications` | `NotificationsPage` | `scripts/smoke_test.sh` |

## 9. Module 8 — Non-functional requirements and business rules

| ID | Requirement | Evidence |
|---|---|---|
| PE-1 | 100 concurrent voice commands ≤ 3 s | `NfrTest.testConcurrentVoiceInterpretationThroughput`; `scripts/load_test.sh` |
| PE-2 | Channel sync ≤ 5 s | `NfrTest.testStockSyncLatency` |
| PE-3 | Webhook processed ≤ 10 s | `WebhookSecurityTest`, `scripts/simulate_marketplace.sh` |
| PE-4 | Forecast job ≤ 30 min | `ForecastTest` (the pipeline runs in well under a second on the test data; the 30-minute budget is not stressed) |
| SE-1 | Lockout; TLS 1.2+ for payment/PII | lockout: `NfrTest.testFailedLoginLockout`. TLS is a **deployment** concern (terminate HTTPS at the reverse proxy); no payment data is stored |
| SE-2 / SE-3 | Authentication; RBAC | `RbacMatrixTest`, `scripts/smoke_test.sh` |
| SE-4 | Voice audio not stored | audio never reaches the server (browser speech recognition); only the transcript is sent |
| SE-5 | Audit log | `AuditLogger`; `GET /admin/audit-log` (in-memory buffer of the latest 1000 events plus structured log lines) |
| SA-2 | Audio volume cap | `isms.audio-alert-max-volume` (shown in Settings) |
| BR-1 … BR-5 | Business rules | BR-1 `Seq2PurchaseOrderTest`/`RbacMatrixTest` · BR-2 `testManagerApprovalLimitEnforced`, `testSupplierCreditLimitEnforced` · BR-3 `StockConcurrencyTest`, `SalesConcurrencyTest`, DB CHECK · BR-4 `Seq2PurchaseOrderTest` · BR-5 `testDeactivateSupplierBlockedWithOpenPos` |
| Data model | 12 classes, 43 operations, 9 relationships | `ClassContractTest` (12), `ClassDiagramStructureTest` (12), `SchemaMatchesSpecTest` |
| Sequence diagrams | Message order of SD-1, SD-2, SD-3 | `Seq1InventoryTest`, `Seq2PurchaseOrderTest`, `Seq3SalesTest` (via `CallTraceAspect`) |
| Whole system | End-to-end API behaviour | `scripts/smoke_test.sh` (53 checks) |

## 10. Known limits (honest scope)

- Speech-to-text / text-to-speech use the browser engines; there is no server-side speech service.
- Marketplace channel push is a stub adapter (logged); inbound webhooks are real and HMAC-verified.
- Payment is a mock gateway that returns a payment reference.
- The audit viewer shows the latest 1000 events held in memory (older events remain in the structured log output).
- HTTPS, 99.5% availability and horizontal scaling are deployment properties and are not exercised by the test suite.
