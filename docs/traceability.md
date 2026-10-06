# ISMS Requirements Traceability Matrix (RTM)

This document maps every requirement, SRS tag, business rule, and non-functional requirement (NFR) to its corresponding architecture components, backend source files, REST endpoints, frontend views, and automated tests.

---

## 1. Traceability Summary Matrix

| Requirement / Tag | Description | Architecture / DFD | Backend Implementation | REST Endpoints | Frontend View | Automated Test(s) |
|---|---|---|---|---|---|---|
| **F1.1** `Auth.Login` | Secure user authentication, BCrypt verification, JWT token issuance | DFD 2.0 / `User` | `UserService.java`<br>`JwtService.java` | `POST /api/v1/auth/login` | `LoginPage.tsx` | `AuthServiceTest`<br>`AuthIntegrationTest`<br>`ClassContractTest` |
| **F1.2** `Auth.Lockout` | 5 failed logins locks account for 15 minutes (SE-1) | DFD 2.0 / `User` | `LoginAttemptCache.java`<br>`UserService.java` | `POST /api/v1/auth/login` | `LoginPage.tsx` | `AuthIntegrationTest`<br>`NfrTest.testFailedLoginLockout` |
| **F1.3** `Auth.Session.Timeout` | 30-minute sliding session expiration, automatic token renewal | DFD 2.0 / `User` | `JwtAuthFilter.java`<br>`JwtService.java` | All authenticated endpoints (`X-Refreshed-Token`) | `client.ts`<br>`AuthContext.tsx` | `AuthIntegrationTest`<br>`NfrTest.testSlidingSessionTokenRenewal` |
| **F1.4** `Auth.Reset` | Password reset via temporary token and email dispatch | DFD 2.0 / `User` | `UserService.java`<br>`SmtpMailerAdapter.java` | `POST /api/v1/auth/password-reset/request`<br>`POST /api/v1/auth/password-reset/confirm` | `LoginPage.tsx` | `AuthIntegrationTest` |
| **F1.5** `Role.Assign` | Role-Based Access Control matrix (Admin, Manager, Warehouse Staff, Sales Personnel) | DFD 2.0 / `Administrator` | `AdministratorService.java`<br>`SecurityConfig.java` | `PATCH /api/v1/users/{id}/role` | `UsersPage.tsx` | `RbacMatrixTest`<br>`AdminTest.testAssignRole` |
| **F2.1** `Notification.Alerts` | Multi-channel notifications (in-app, email, audio synthesis) | DFD 7.0 / `Notification` | `NotificationService.java`<br>`SmtpMailerAdapter.java` | `GET /api/v1/notifications`<br>`PATCH /api/v1/notifications/{id}/read` | `NotificationsPage.tsx` | `Seq1InventoryTest`<br>`ClassContractTest` |
| **F2.2** `Notification.LowStock` | Low stock triggers immediate notification and audio chime | DFD 7.0 / `Notification` | `NotificationService.java`<br>`StockRecordService.java` | `WS /ws/alerts` | `InventoryPage.tsx` | `Seq1InventoryTest`<br>`ForecastTest` |
| **F2.3** `Notification.ShippingDelay`| Hourly automated job flagging overdue purchase orders | DFD 7.0 / `Notification` | `PurchaseOrderService.java`<br>`OverduePoScheduledJob.java` | Scheduled Job | `PurchaseOrdersPage.tsx` | `Seq2PurchaseOrderTest` |
| **C1.1–C1.5** `Inventory.CRUD` | Product catalog CRUD operations and validation | DFD 4.0 / `Product` | `ProductService.java`<br>`ProductRepository.java` | `GET/POST /api/v1/products`<br>`PATCH/DELETE /api/v1/products/{id}` | `InventoryPage.tsx` | `Seq1InventoryTest`<br>`ClassContractTest` |
| **C1.6** `Inventory.Search` | Real-time multi-attribute search and category filters | DFD 4.0 / `Product` | `ProductService.java`<br>`StockRecordRepository.java` | `GET /api/v1/products?q=&category=` | `InventoryPage.tsx` | `Seq1InventoryTest` |
| **C1.7** `Inventory.StockUpdate` | Stock adjustments with pessimistic row locking (`PESSIMISTIC_WRITE`) | DFD 4.0 / `StockRecord` | `StockRecordService.java` | `PUT /api/v1/stock/{sku}/{location}` | `InventoryPage.tsx` | `StockConcurrencyTest`<br>`Seq1InventoryTest` |
| **C1.8** `Sync.Channel.Realtime` | Multi-channel inventory synchronization within 5 seconds (PE-2) | DFD 4.0 / Adapters | `StubChannelAdapters.java`<br>`StockRecordService.java` | `WS /ws/stock` | `InventoryPage.tsx` | `NfrTest.testStockSyncLatency`<br>`Seq1InventoryTest` |
| **C1.9–C1.10** `Voice.Commands` | Handheld microphone voice interpretation (ISO grammar) & offline queue | DFD 4.1–4.5 / `WarehouseStaff` | `VoiceInterpreter.java`<br>`WarehouseStaffService.java` | `POST /api/v1/voice/command`<br>`POST /api/v1/voice/confirm` | `VoiceCommandPage.tsx` | `VoiceInterpreterTest`<br>`NfrTest.testConcurrentVoiceInterpretationThroughput`<br>`Seq1InventoryTest` |
| **C2.1–C2.4** `Supplier.CRUD` | Vendor directory CRUD, performance tracking, rating clamping [0, 5] | DFD 3.0 / `Supplier` | `SupplierService.java`<br>`SupplierRepository.java` | `GET/POST /api/v1/suppliers`<br>`PUT /api/v1/suppliers/{id}` | `SuppliersPage.tsx` | `Seq2PurchaseOrderTest`<br>`ClassContractTest` |
| **C2.5–C2.8** `PO.Lifecycle` | Purchase order 6-state machine (`Draft`, `Pending Approval`, `Approved`, `Partially Received`, `Received`, `Cancelled`) | DFD 3.0 / `PurchaseOrder` | `PurchaseOrderService.java`<br>`ManagerService.java` | `GET/POST /api/v1/purchase-orders`<br>`POST /api/v1/purchase-orders/{id}/submit` | `PurchaseOrdersPage.tsx` | `PoStateMachineTest`<br>`Seq2PurchaseOrderTest` |
| **C2.9** `PO.ApprovalLimit` | Manager limit $50,000 enforcement; unlimited Admin approval (BR-2) | DFD 3.0 / `PurchaseOrder` | `PurchaseOrderService.java`<br>`ManagerService.java` | `POST /api/v1/purchase-orders/{id}/approve` | `PurchaseOrdersPage.tsx` | `Seq2PurchaseOrderTest` |
| **C2.10** `PO.CreditLimit` | Supplier credit exposure limit $100,000 enforcement (BR-2) | DFD 3.0 / `PurchaseOrder` | `PurchaseOrderService.java` | `POST /api/v1/purchase-orders` | `PurchaseOrdersPage.tsx` | `Seq2PurchaseOrderTest` |
| **C2.11** `PO.Receipt` | Goods receipt confirmation, stock increments, supplier rating update | DFD 3.0 / `WarehouseStaff` | `WarehouseStaffService.java`<br>`PurchaseOrderService.java` | `POST /api/v1/purchase-orders/{id}/receive` | `PurchaseOrdersPage.tsx` | `Seq2PurchaseOrderTest` |
| **C2.12** `Supplier.Deactivate`| Deactivation safeguard: blocked if open purchase orders exist (BR-5) | DFD 2.0 / `Administrator` | `AdministratorService.java` | `POST /api/v1/suppliers/{id}/deactivate` | `SuppliersPage.tsx` | `Seq2PurchaseOrderTest`<br>`AdminTest` |
| **C3.1–C3.4** `Sales.Physical` | In-store POS barcode scanner input, pre-check, and atomic deduction | DFD 6.0 / `SalesPersonnel` | `SalesPersonnelService.java`<br>`SalesOrderService.java` | `POST /api/v1/sales/physical` | `SalesPage.tsx` | `Seq3SalesTest`<br>`ClassContractTest` |
| **C3.5** `Sales.Invoice` | OpenPDF invoice generation saved to `storage/invoices/{order_id}.pdf` | DFD 6.0 / `SalesOrder` | `SalesOrderService.java` | `GET /api/v1/sales/{id}/invoice` | `SalesPage.tsx` | `Seq3SalesTest.testPhysicalSaleGeneratesPdfInvoice` |
| **C3.6** `Sales.Webhook` | Marketplace webhook HMAC-SHA256 signature verification (`X-Signature`) | DFD 6.0 / `SalesOrder` | `SalesOrderService.java`<br>`SalesController.java` | `POST /api/v1/sales/webhook/{marketplace}` | `SalesPage.tsx`<br>`simulate_marketplace.sh` | `WebhookSecurityTest`<br>`Seq3SalesTest` |
| **C3.7** `Sales.Idempotency` | Idempotent duplicate event suppression on marketplace webhooks | DFD 6.0 / `SalesOrder` | `SalesOrderService.java` | `POST /api/v1/sales/webhook/{marketplace}` | `SalesPage.tsx` | `WebhookSecurityTest.testIdempotentDuplicateWebhook` |
| **C3.8** `Sales.Return` | Process customer returns, reverses inventory levels to stock | DFD 6.0 / `SalesOrder` | `SalesOrderService.java` | `POST /api/v1/sales/{id}/return` | `SalesPage.tsx` | `Seq3SalesTest.testReturnOrderRestocksInventory` |
| **E1.1** `Forecast.Demand` | Hand-written Holt-Winters additive demand forecasting ($\alpha=0.2, \beta=0.1, \gamma=0.2$) | DFD 5.0 / `Forecast` | `ForecastService.java`<br>`ForecastRepository.java` | `POST /api/v1/forecast/run`<br>`GET /api/v1/forecast` | `ForecastPage.tsx` | `ForecastTest.testForecastPipelineAndContractCalls`<br>`ClassContractTest` |
| **E1.2** `Forecast.Seasonality` | Weekly seasonality cycle detection via autocorrelation | DFD 5.0 / `Forecast` | `ForecastService.java` | `POST /api/v1/forecast/run` | `ForecastPage.tsx` | `ForecastTest` |
| **E1.3–E1.4** `Forecast.Reorder` | Lead time based recommendations and 1-Click PO draft generator | DFD 5.0 / `Forecast` | `ForecastService.java` | `GET /api/v1/forecast/reorder-suggestions` | `ForecastPage.tsx` | `ForecastTest.testReorderSuggestionsAndPoPayload` |
| **E1.5** `Analytics.Revenue` | Revenue dashboard grouped by channel, location, or date | DFD 5.0 / Analytics | `ForecastService.java`<br>`AnalyticsController.java` | `GET /api/v1/analytics/revenue` | `ForecastPage.tsx` | `ForecastTest` |
| **E1.6** `Analytics.Stock` | Inventory valuation, low-stock, out-of-stock, and overstock analysis | DFD 5.0 / Analytics | `ForecastService.java`<br>`AnalyticsController.java` | `GET /api/v1/analytics/stock` | `ForecastPage.tsx` | `ForecastTest.testStockAnalytics` |
| **E2.1** `Admin.UserManagement`| User directory list, create, deactivate, and unlock locked accounts | DFD 2.0 / `Administrator` | `AdministratorService.java`<br>`UserController.java` | `GET/POST /api/v1/users`<br>`PATCH /api/v1/users/{id}/status` | `UsersPage.tsx` | `AdminTest.testUserCrudAndUnlock` |
| **E2.2** `Admin.RoleAssign` | Dynamic role assignment across user base | DFD 2.0 / `Administrator` | `AdministratorService.java`<br>`UserController.java` | `PATCH /api/v1/users/{id}/role` | `UsersPage.tsx` | `AdminTest.testAssignRole`<br>`RbacMatrixTest` |
| **E2.4** `Admin.Settings` | Read-only global system limits and environment controls | DFD 2.0 / Configuration | `SettingsController.java`<br>`AppProperties.java` | `GET /api/v1/settings` | `UsersPage.tsx` | `AdminTest` |
| **E3.1** `Quality.Simulator` | CLI tool and dev endpoint simulating HMAC signed marketplace orders | DFD 6.0 / Simulator | `SalesController.java`<br>`simulate_marketplace.sh` | `POST /api/v1/dev/simulate-marketplace-order` | `SalesPage.tsx` | `WebhookSecurityTest` |
| **E3.2** `Quality.Onboarding` | Contextual help and role onboarding walkthrough (UD-1, UD-2) | UI Documentation | `UsersPage.tsx`<br>`Layout.tsx` | Documentation / UI Modal | `UsersPage.tsx` | Verified via UI inspection |
| **E3.3** `Quality.Validation` | Inline form validation and voice state indicators (UI-3, UI-4) | UI Polish | React Form Hooks | Client-side validation | All form dialogs | Vitest frontend suite |
| **E3.4** `Quality.LoadTest` | Automated concurrency & latency benchmark script for PE-1/PE-3 | NFR Benchmark | `scripts/load_test.sh` | CLI Script | N/A | `scripts/load_test.sh` |

---

## 2. Sequence Diagram Conformance

Every sequence diagram in the specification has a matching automated test validating that service operations execute in the exact diagram message order using Spring AOP `CallTraceAspect`:

1. **Sequence 1: Inventory Update & Voice Command**
   - **Order:** `ProductService.search` &rarr; `ProductService.create` &rarr; `StockRecordService.updateStock` &rarr; `ProductService.update` &rarr; `ProductService.delete` &rarr; `WarehouseStaffService.captureVoiceCommand` &rarr; `StockRecordService.updateStock` &rarr; `StockRecordService.realtimeSync` &rarr; `NotificationService.triggerLowStock` / `NotificationService.sendAudioAlert`.
   - **Verified by:** `Seq1InventoryTest.java` (Passing).

2. **Sequence 2: Purchase Order Lifecycle & Multi-Tier Approval**
   - **Order:** `SupplierService.search` &rarr; `ProductService.search` &rarr; `PurchaseOrderService.create` &rarr; `ManagerService.approvePo` &rarr; `PurchaseOrderService.approve` &rarr; `WarehouseStaffService.receivePoConfirm` &rarr; `PurchaseOrderService.receiveConfirm` &rarr; `SupplierService.trackPerformance`.
   - **Alternative Branch (Rejection):** `ManagerService.rejectPo` &rarr; `PurchaseOrderService.reject` (status reverts to `Draft`).
   - **Optional Branch (Overdue PO):** `PurchaseOrderService.flagOverdue` &rarr; `NotificationService.triggerShippingDelay`.
   - **Verified by:** `Seq2PurchaseOrderTest.java` (Passing).

3. **Sequence 3: Physical & Marketplace Sales Order Processing**
   - **Order:** `SalesPersonnelService.logPhysicalSale` &rarr; `ProductService.search` &rarr; `SalesOrderService.createOrder` &rarr; `StockRecordService.deductStock` &rarr; `SalesOrderService.generateInvoice`.
   - **Alternative Branch (Marketplace Webhook):** `SalesOrderService.processWebhook` &rarr; `StockRecordService.deductStock` &rarr; `SalesOrderService.generateInvoice`.
   - **Optional Branch (Returns):** `SalesOrderService.processReturn` &rarr; `StockRecordService.updateStock`.
   - **Verified by:** `Seq3SalesTest.java` (Passing).

---

## 3. Non-Functional Requirements (NFR) Validation

- **PE-1: Response Latency:** Page & API endpoint responses execute under 2.0s $p95$ threshold under load (verified via `scripts/load_test.sh`).
- **PE-2: Multi-Channel Synchronization:** Stock updates propagate across marketplace adapters within 5 seconds (verified via `NfrTest.testStockSyncLatency`).
- **PE-3: Voice Command Concurrency:** 100 concurrent voice interpretation requests complete in under 3.0 seconds (verified via `NfrTest.testConcurrentVoiceInterpretationThroughput`).
- **SE-1: Authentication Security:** 5 failed logins triggers temporary account lockout (verified via `NfrTest.testFailedLoginLockout`).
- **SA-2: Audio Volume Ceiling:** Audio alert synthesis volume is capped at configured ceiling (verified via `AppProperties.audioAlertMaxVolume`).
- **HI-1 / HI-2: Barcode & Microphones:** Browser Web Audio API integration and keyboard-wedge compatible POS inputs emulate dedicated handheld scanning hardware.
