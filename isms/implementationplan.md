# implementationplan.md — How We Build It (Spring Boot edition)

## 1. Tech stack (and why)

| Layer | Choice | Reason |
|---|---|---|
| Language / build | **Java 21 + Maven** (wrapper `./mvnw`) | Strong typing; class-per-entity OOP maps directly to the class diagram |
| Backend framework | **Spring Boot 3.3.x** (Web, Validation, Actuator) | Mature, standard, auto OpenAPI via springdoc |
| Persistence | **Spring Data JPA (Hibernate 6)** with `ddl-auto=validate` | Entities mirror `schema.md`; Hibernate refuses to start if they drift |
| Migrations | **Flyway** — `V1__init.sql` is the DDL from `schema.md` copied verbatim | Reviewable, versioned schema (SRS CO-2) |
| Database | **PostgreSQL 16** | Row locks, CHECK constraints |
| Auth | **Spring Security 6** + stateless **JWT** (`jjwt`) + **BCrypt** (`BCryptPasswordEncoder`), sliding 30-min expiry | SRS Auth.* |
| Validation | Jakarta Bean Validation (`@Valid`) | Server-side mirror of inline UI validation (UI-4) |
| Realtime | **Spring WebSocket** (native handlers `/ws/stock`, `/ws/alerts`) | Sync ≤ 5 s, audio alerts |
| Scheduler | Spring **`@Scheduled`** | Overdue check hourly, forecast nightly |
| Forecasting | Hand-written **Holt-Winters (additive)** + seasonal-naive fallback in `ForecastingAdapter` (optionally Apache Commons Math for helpers) | SRS 4.6; no Python dependency; behind `ForecastingService` interface |
| PDF invoices | **OpenPDF** (`com.github.librepdf:openpdf`) | Invoice.Generate |
| E-mail | `spring-boot-starter-mail` → SMTP → **Mailpit** container | Visible demo mails |
| SMS / Payment / Marketplace | Stub adapters implementing interfaces; HMAC verification is real (`javax.crypto.Mac`) | External services out of scope, boundaries real |
| Frontend | **React 18 + Vite + TypeScript + Tailwind + TanStack Query + React Router** (unchanged) | Role dashboards |
| Charts | Recharts | Dashboards |
| Voice | Browser **Web Speech API** behind a `SpeechProvider` (unchanged) | No paid API |
| Tests | **JUnit 5**, Spring Boot Test, **MockMvc**, **Testcontainers (PostgreSQL)**, Mockito, JUnit `@RepeatedTest`/`ExecutorService` for concurrency; frontend **Vitest**; optional **Playwright** | |
| Packaging | Docker Compose: `db`, `backend` (multi-stage Maven → JRE 21), `frontend`, `mailpit` | One-command run |

## 2. Architecture

```
React SPA ──HTTPS/JSON──► Spring MVC controllers ──► Domain services (one class per diagram class) ──► Spring Data JPA ──► PostgreSQL
   │  ▲                        │                          │
   │  └── WebSocket ◄──────────┘ (stock events, audio alerts)
   └── Web Speech API (STT/TTS)                           ├─► Adapters: Mailer, SmsGateway, PaymentGateway,
                                                          │             MarketplaceChannel, SpeechProvider, ForecastingService
                                                          └─► @Scheduled jobs (flagOverdue, generateDemand)
```

### 2.1 Backend layout (`backend/`, base package `com.isms`)

```
backend/
  pom.xml  Dockerfile  mvnw
  src/main/java/com/isms/
    IsmsApplication.java
    config/        # AppProperties (@ConfigurationProperties), SecurityConfig, WebSocketConfig, SchedulingConfig
    model/         # JPA entities, one per table in schema.md (+ composite id classes)
      User.java Product.java StockRecord.java StockRecordId.java Forecast.java ForecastId.java
      Supplier.java PurchaseOrder.java PoLineItem.java PoLineItemId.java
      SalesOrder.java SalesOrderLineItem.java SalesOrderLineItemId.java Notification.java
      enums/ Role.java UserStatus.java PoStatus.java SalesStatus.java NotificationType.java NotificationChannel.java NotificationStatus.java
    repository/    # Spring Data repositories (StockRecordRepository has the PESSIMISTIC_WRITE finders)
    domain/        # one service class per class-diagram class; method names = diagram names in camelCase
      UserService.java            # login, logout, resetPassword
      AdministratorService.java   # assignRole, deactivateSupplier
      ManagerService.java         # approvePo, rejectPo
      WarehouseStaffService.java  # captureVoiceCommand, receivePoConfirm
      SalesPersonnelService.java  # logPhysicalSale
      ProductService.java         # create, update, delete, search
      StockRecordService.java     # updateStock, deductStock, realtimeSync
      SupplierService.java        # create, edit, trackPerformance, search
      PurchaseOrderService.java   # create, approve, reject, receiveConfirm, flagOverdue
      SalesOrderService.java      # createOrder, processWebhook, processReturn, generateInvoice
      ForecastService.java        # generateDemand, detectSeasonality, recommendReorder
      NotificationService.java    # triggerLowStock, triggerShippingDelay, sendAudioAlert
      voice/VoiceInterpreter.java # grammar parser used by captureVoiceCommand
    api/           # @RestController classes per api-spec.md; thin, call domain only; request/response DTO records in api/dto
    adapter/       # MailerAdapter SmsAdapter PaymentAdapter MarketplaceAdapter SpeechProvider ForecastingAdapter (interfaces + stub impls)
    security/      # JwtService, JwtAuthFilter, RoleGuard (@PreAuthorize helpers), LoginAttemptCache
    trace/         # CallTrace (request-scoped), CallTraceAspect (@Around on com.isms.domain..*)
    audit/         # AuditLogger (JSON lines via Logback)
    job/           # OverdueJob, ForecastJob
    error/         # ApiException + GlobalExceptionHandler (error JSON per api-spec.md)
  src/main/resources/
    application.yml        # all values overridable by env vars (see §3)
    db/migration/V1__init.sql   # == schema.md DDL
    db/migration/V2__seed_reference.sql (optional)  # demo data is loaded by DemoDataSeeder (profile "demo")
  src/test/java/com/isms/ ...
frontend/    # React app (src/pages/{auth,inventory,voice,suppliers,purchase-orders,sales,forecast,admin,notifications})
scripts/     # simulate_marketplace.sh (curl + openssl HMAC) or SimulateMarketplace.java
docs/source/ docs/traceability.md
docker-compose.yml  Makefile  README.md  .env.example
```

**Rules for the service layer**

1. **Naming rule.** Every operation in the class diagram exists on the Java service class for its owning class, with the diagram name converted mechanically from `snake_case` to `camelCase` (`update_stock` → `updateStock`, `receive_po_confirm` → `receivePoConfirm`, `capture_voice_command` → `captureVoiceCommand`). Class mapping: `Product→ProductService`, `StockRecord→StockRecordService`, `Manager→ManagerService`, etc. No other public methods on these classes except documented helpers prefixed with an underscore-free private modifier.
2. `User` subclasses (Manager, WarehouseStaff, Administrator, SalesPersonnel) are **not** separate JPA entities (single `users` table, `role` column). They are service classes whose methods check the caller's role, then delegate.
3. Every public domain method is `@Transactional`, writes an audit-log line, and is recorded by `CallTraceAspect` into a request-scoped `CallTrace` (class + method name, in call order). **Sequence tests assert on this trace.**
4. Controllers never touch repositories directly.
5. All stock quantity changes go through `StockRecordService.updateStock()` or `deductStock()`; both load the row with `@Lock(LockModeType.PESSIMISTIC_WRITE)`, enforce BR-3, call `realtimeSync()` after commit (`TransactionSynchronization.afterCommit`), then check the reorder point (Seq 1 `alt`).
6. Entities map columns exactly as in `schema.md` (explicit `@Column(name=…)`, `@Table(name=…)`); `spring.jpa.hibernate.ddl-auto=validate`. Never use `update`/`create`.

### 2.2 Key flows (derived from sequences + DFD)

**Seq 1 / DFD 4.x — voice stock update**
`POST /voice/command` → `WarehouseStaffService.captureVoiceCommand()` (4.1/4.2; confidence gate) → `VoiceInterpreter` (4.3) → return spoken confirmation text (4.4) → `POST /voice/confirm` → `StockRecordService.updateStock()` (4.5) → `realtimeSync()` → if `quantityOnHand < Product.reorderPoint`: `NotificationService.triggerLowStock()` → `sendAudioAlert()`; else respond "no alert required".

**Seq 2 / DFD 6.0 — PO**
`SupplierService.search()` → `ProductService.search()` → `PurchaseOrderService.create()` (Draft) → submit → **alt** approve: `ManagerService.approvePo()` → `PurchaseOrderService.approve()` (limit, BR-2) → on receipt `WarehouseStaffService.receivePoConfirm()` → `PurchaseOrderService.receiveConfirm()` → `StockRecordService.updateStock()` → `SupplierService.trackPerformance()` (BR-4, only when status becomes Received/Cancelled) ; **alt** reject: `ManagerService.rejectPo()` → `PurchaseOrderService.reject()` ; **opt** `PurchaseOrderService.flagOverdue()` → `NotificationService.triggerShippingDelay()`.

**Seq 3 / DFD 3.x — sale**
Physical: `SalesPersonnelService.logPhysicalSale()` → `ProductService.search()` (3.2) → `SalesOrderService.createOrder()` (3.1) → stock availability (3.3) → **alt** ok: payment stub (3.4), `StockRecordService.deductStock()`, `SalesOrderService.generateInvoice()` (3.5), status Completed (3.6) ; **alt** not ok: line rejected, Manager notified, status Rejected ; **opt** `processReturn()` reverses stock.
Webhook: verify HMAC → `SalesOrderService.processWebhook()` → create/update order → reserve (`quantity_reserved`) on created → deduct on paid → release on cancelled → restock on returned.

### 2.3 Concurrency & real-time

- `updateStock/deductStock`: pessimistic write lock on `(sku_id, location_id)`; validate; update; commit; publish event after commit.
- Reservation: `quantity_reserved` increments only if `quantity_on_hand - quantity_reserved >= qty`.
- `StockEventPublisher` (Spring `ApplicationEventPublisher`) fans out `{sku, location, quantityOnHand, quantityReserved, ts}` to the WebSocket session registry and to channel adapters (storefront / marketplace stubs), which log "pushed" with latency (asserted ≤ 5 s).

### 2.4 Security

BCrypt password hashes; JWT secret from env; stateless sessions with sliding expiry (new token returned in `X-Refreshed-Token` header on activity); CORS limited to frontend origin; login attempt cache (Caffeine or `ConcurrentHashMap` with TTL) for lockout; method security with `@PreAuthorize("hasAnyRole(...)")` using the 4 roles; TLS terminated at proxy in production (README note, SE-1); webhook HMAC-SHA256 with `MessageDigest.isEqual` constant-time compare + timestamp tolerance + idempotency by `order_id`; voice audio never leaves the browser (text only, SE-4); PII at rest: documented disk-level encryption / optional `pgcrypto` (CO-1), no PII in logs.

## 3. Configuration (`application.yml` with env overrides; `.env.example` for Compose)

```
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/isms
SPRING_DATASOURCE_USERNAME=isms
SPRING_DATASOURCE_PASSWORD=isms
JWT_SECRET=change-me-at-least-32-bytes-long-secret
SESSION_IDLE_MINUTES=30
LOGIN_MAX_FAILS=5
LOGIN_FAIL_WINDOW_MINUTES=15
VOICE_CONFIDENCE_THRESHOLD=0.75
APPROVAL_LIMIT_MANAGER=100000
SUPPLIER_CREDIT_LIMIT=500000
TAX_RATE=0.18
AUDIO_ALERT_MAX_VOLUME=0.6
MARKETPLACE_SECRETS={"amazon":"secret1","flipkart":"secret2"}
SPRING_MAIL_HOST=mailpit
SPRING_MAIL_PORT=1025
STORAGE_DIR=/app/storage
SPRING_PROFILES_ACTIVE=demo
```

Bound to a typed `AppProperties` class (`@ConfigurationProperties(prefix="isms")`).

## 4. Build order (step by step; each step ends with `./mvnw verify` green)

1. **Repo & Compose**: Maven project (Spring Initializr dependencies: Web, Security, Data JPA, Validation, WebSocket, Mail, Actuator, Flyway, PostgreSQL driver, Testcontainers), Dockerfile, Makefile (`make up|down|test|seed|reset`), `/health`.
2. **Flyway V1 + entities** exactly from `schema.md`; **`SchemaMatchesSpecTest`** (compares `information_schema` against an expected-schema JSON kept in `src/test/resources/expected-schema.json`) and Hibernate `validate`.
3. **Core infrastructure**: `AppProperties`, security config, `GlobalExceptionHandler`, `AuditLogger`, `CallTrace` + aspect.
4. **F1 Auth** (UserService + AuthController, lockout, sliding timeout, password reset via Mailpit), demo seed users.
5. **NotificationService + adapters** (needed by step 6).
6. **C1 Inventory**: ProductService, StockRecordService, search, WebSocket hub, concurrency test; `VoiceInterpreter` + confirm flow; low-stock branch; **`Seq1InventoryTest`**.
7. **Frontend shell** + login + role navigation + inventory pages + voice page (state indicator, fallback form, offline queue).
8. **C2 Supplier & PO**: services, state machine, approval limit, credit check, receipt, performance, `OverdueJob`; **`Seq2PurchaseOrderTest`**; frontend pages.
9. **C3 Sales**: physical flow, mock payment, OpenPDF invoice, webhook + simulator, return; **`Seq3SalesTest`**; POS-style frontend with scanner-wedge input.
10. **E1 Forecast + dashboards**: Holt-Winters, reorder recommend, suggestion → PO draft; charts.
11. **E2/E3**: admin pages, onboarding, help links, polish, empty/error states.
12. **Hardening**: NFR tests, README, demo script, `docs/traceability.md`, `ClassContractTest`.

## 5. Testing strategy

| Test class | Purpose |
|---|---|
| `SchemaMatchesSpecTest` | Running DB == `schema.md` (tables, columns, types, nullability, PKs, FKs, CHECKs) |
| `ClassContractTest` | Reflection test: for each diagram class → service class mapping, every diagram method (snake→camel) exists and is public. Mapping table lives in the test itself. |
| `Seq1InventoryTest`, `Seq2PurchaseOrderTest`, `Seq3SalesTest` | `CallTrace` order equals the diagram; both branches of each `alt`/`opt`; `loop` for voice capture |
| `RbacMatrixTest` | Role table in `feature.md` enforced (parameterised) |
| `StockConcurrencyTest` | 50 parallel deductions via `ExecutorService` never go negative; last-unit conflict |
| `PoStateMachineTest` | Only legal transitions |
| `WebhookSecurityTest` | Bad/missing signature, replay, idempotency |
| `VoiceInterpreterTest` | Grammar cases + low confidence |
| `NfrTest*` | 5 s sync, 5 failed logins lock, 30 min timeout (clock injected), 100 concurrent voice commands under 3 s |
| Frontend Vitest + (optional) Playwright happy paths per role |

Use `@SpringBootTest` + `@Testcontainers` with one shared PostgreSQL container; inject a `Clock` bean so time-based rules (timeout, overdue, lockout window) are testable.

## 6. Demo script (acceptance walkthrough)

1. Login as Warehouse Staff → say "add twenty units of SKU-1001 to location WH-01" → hear confirmation → confirm → stock updates live in a second tab; another SKU drops below reorder point → audio alert + e-mail in Mailpit.
2. Login as Manager → search supplier → create PO → submit → approve (also show reject path) → login as Warehouse Staff → partial receipt then full receipt → supplier rating updates → show overdue PO flagged.
3. Login as Sales Personnel → scan items → sale completes → download invoice → run `scripts/simulate_marketplace.sh` → webhook order appears and stock decrements → process a return → stock restored.
4. Manager opens dashboards and reorder suggestions → one-click PO draft.

## 7. Requirement coverage notes

- CO-1 / SE-1: documented TLS termination & encrypted-at-rest approach; code does not log PII.
- OE-3 / HI-1 / HI-2: handheld microphone via browser; barcode scanners emulated by keyboard-wedge input in the POS field.
- TBD items from SRS Appendix C are resolved in `plan.md` §6 (D10, D11) and listed in README "Assumptions".
