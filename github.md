# ISMS — Module-by-Module GitHub Hand-off

> Moving the finished project into a **new repository**, one module at a time, alternating pushes.
> **Dev Gaglani** (`2024300057`) pushes the **odd** modules (1, 3, 5, 7) · **Stavan Desai** (`2024300042`) pushes the **even** modules (2, 4, 6, 8).
> After every push the repository still compiles (backend tests + frontend type-check). This was verified for all eight stages.

---

## 1. The eight modules

The seven modules are the seven SRS feature areas (`moodle/moodle.md` §A4.1–A4.7); module 8 is everything else.

| # | Pusher | Module | What it covers | Tests that arrive with it |
|---|--------|--------|----------------|---------------------------|
| **1** | **Dev** | **Auth & RBAC** | Secure login and role-specific access control for administrators, managers, warehouse staff and sales personnel: JWT, 5-fail lockout (persisted, admin-unlockable), password reset, sliding 30-min session, RBAC, audit log, user admin, system settings. **Also carries the project foundation** every module needs (Maven/Docker/Flyway scaffold, all entities and repositories, design system, app shell, live dashboard, requirement docs) | `AuthIntegrationTest`, `RbacMatrixTest`, `AdminTest`, `BcryptTest`, `HealthControllerTest`, `SchemaMatchesSpecTest` |
| 2 | Stavan | Voice-Enabled Inventory & Omnichannel Sync | Full CRUD on products and stock via the standard UI or hands-free voice commands: guarded delete, row-lock stock updates, BR-3, real-time WebSocket sync, voice interpreter. **Also carries the notification engine and WebSocket handlers**, because every stock change can raise a low-stock alert | `StockConcurrencyTest` |
| **3** | **Dev** | **Supplier Management** | Vendor profiles, contact details, performance rating and history, search, administrator-only deactivation | – |
| 4 | Stavan | Purchase Order Management | Creates, approves and tracks inbound POs (6 states, approval and credit limits, reject-to-draft, partial receipt, overdue flag), automatically boosting stock on receipt. **Also carries** the warehouse-staff service and the voice endpoints, which share the receiving workflow | `Seq1InventoryTest`, `Seq2PurchaseOrderTest`, `PoStateMachineTest`, `VoiceInterpreterTest` |
| **5** | **Dev** | **Sales Tracking & Order Management** | Physical and digital sales, marketplace webhooks (HMAC, idempotent), PDF invoicing, returns, automatic stock deduction and the "last unit" conflict rule | `Seq3SalesTest`, `WebhookSecurityTest`, `SalesConcurrencyTest` |
| 6 | Stavan | Predictive Analytics & AI Forecasting | Revenue and stock dashboards; Holt-Winters demand forecast with seasonality, reorder points, one-click draft POs, forecast-accuracy tracking | `ForecastTest` |
| **7** | **Dev** | **Multimodal Notification System** | Real-time low-stock and shipping-delay alerts: notification inbox (mark read), per-user channel preferences (e-mail, SMS, audio). The engine itself arrived in module 2 | – |
| 8 | Stavan | Platform hardening (the rest) | Demo data seeder, non-functional tests, class-diagram tests, load/smoke scripts, README, traceability matrix, class-diagram mapping, this guide, the Experiment 8 report | `NfrTest`, `ClassContractTest`, `ClassDiagramStructureTest` |

### Why a few files ride with an earlier module

The modules follow the SRS, but the code has real dependencies between them, and each push must compile on its own:

| File(s) | Belongs to | Ships in | Because |
|---|---|---|---|
| Entities, repositories, Flyway V1–V6, build config, design system | foundation | **1** | every module uses them (`ddl-auto: validate` needs the full schema) |
| `NotificationService`, WebSocket handlers, `StubChannelAdapters` | Notifications (7) | **2** | `StockRecordService` raises alerts and pushes live updates |
| `WarehouseStaffService`, `VoiceController`, Voice page, `VoiceInterpreterTest` | Voice (2) | **4** | the same class also confirms PO receipts (class diagram: `WarehouseStaff`) |
| `SaleRecordedEvent` | Forecasting (6) | **5** | Sales publishes an event; Forecasting listens, so Sales never depends on Forecasting |

`python scripts/module_split.py list` prints the owner and file count of each module; `check` proves every file belongs to exactly one.

---

## 2. One-time setup (Dev, before module 1)

```bash
# an empty new repository on GitHub (no README), then clone it next to the finished project
git clone https://github.com/<owner>/<new-repo>.git isms-new
cd isms-new
git config user.name  "Dev Gaglani"
git config user.email "dev.gaglani1@gmail.com"
# add Stavan as a collaborator (Settings -> Collaborators) so both of you can push
```

The finished project stays in `se-proj/`. `isms-new/` is where the history is built; `se-proj/scripts/module_split.py` copies the right files into it.

> `moodle/moodle.md` (the consolidated SRS, use cases, class/sequence/DFD notes and WBS) is copied in module 1 and is the requirements source. The seven course PDFs in `moodle/` and the stale `isms/` duplicate are deliberately **not** copied (`docs/source/` already has the SRS, DFDs and class diagram). `github2.md` is only for the old `lala` repository.

---

## 3. The loop for every module

Strictly alternate: do not start module *N+1* until module *N* is merged to `main`.

```bash
# in isms-new/
git checkout main && git pull                          # 1. get the other person's module
git checkout -b module-<N>-<slug>                      # 2. slugs are in section 4

python ../se-proj/scripts/module_split.py apply <N> .  # 3. copy module N's files in
                                                       #    (also rewrites App.tsx / Layout.tsx so they only mention pages that exist)

(cd backend  && ./mvnw -q test-compile)                # 4. prove it builds (Windows notes in section 5)
(cd frontend && npm ci && npx tsc --noEmit)

git add -A                                             # 5. one commit per module, message from section 4
git commit -F - <<'MSG'
<message>
MSG

git push -u origin module-<N>-<slug>                   # 6. open a PR, the other person reviews, merge to main
```

Rules of thumb: one commit per module; never hand-edit `App.tsx` / `Layout.tsx`; `apply` only adds files, so run it after pulling. After module 8: `git tag v1.0 && git push --tags`.

---

## 4. Branch names and commit messages

### Module 1 — Dev — `module-1-auth-rbac`
```
feat(auth): authentication, RBAC, audit log and project foundation [SRS 4.1]

- JWT login, 5-fail/15-min lockout persisted as status=locked (admin can unlock), e-mail password reset,
  4 roles, sliding 30-min session, structured audit log + viewer, user admin, read-only settings
- Foundation: Spring Boot 3.3 / Java 21 + React/Vite/Tailwind, Docker Compose, Flyway V1-V6 (all tables),
  JPA entities and repositories, error handling, call-trace aspect
- App shell: light/black dark theme, sidebar layout, role-guarded routes, live dashboard, onboarding
- Requirements: moodle/moodle.md, schema.md, feature.md, api-spec.md, SRS/DFD/class diagram sources

Tests: AuthIntegrationTest, RbacMatrixTest, AdminTest, BcryptTest, HealthControllerTest, SchemaMatchesSpecTest
```

### Module 2 — Stavan — `module-2-voice-inventory-sync`
```
feat(inventory): voice-enabled inventory and omnichannel synchronization [SRS 4.2]

- Product CRUD with guarded delete (409 when stock exists), search by SKU/category/location/quantity
- Row-locked stock updates, BR-3 (never below zero), last-unit conflict handling
- Real-time /ws/stock sync, low-stock alert trigger, notification engine and WebSocket channels
- Voice interpreter (action, SKU, quantity, location; confidence threshold)
- Inventory page with create, edit, delete, adjust and live badge

Tests: StockConcurrencyTest
```

### Module 3 — Dev — `module-3-suppliers`
```
feat(suppliers): supplier management [SRS 4.3]

- Create/edit/search suppliers ranked by rating; contact details and lead time
- BR-4 rating recalculation when a PO closes; performance history endpoint
- BR-5 deactivation (Administrator only, blocked while POs are open)
- Suppliers page with performance-history modal
```

### Module 4 — Stavan — `module-4-purchase-orders`
```
feat(po): purchase-order management and goods receipt [SRS 4.4]

- Draft -> Pending Approval -> Approved -> Partially Received -> Received / Cancelled; illegal transitions rejected
- BR-1 roles, BR-2 manager approval limit and supplier credit limit, reject back to Draft with a reason
- Partial receipt raises stock; hourly overdue flag raises shipping-delay alerts
- Voice endpoints and WarehouseStaff service (shared receiving workflow)
- Purchase Orders and Voice pages

Tests: Seq1InventoryTest, Seq2PurchaseOrderTest, PoStateMachineTest, VoiceInterpreterTest
```

### Module 5 — Dev — `module-5-sales`
```
feat(sales): sales tracking and order management [SRS 4.5]

- Physical sale with atomic stock deduction; insufficient stock keeps a REJECTED order and notifies the manager
- PDF invoice (OpenPDF), returns restore stock, order list with totals
- Marketplace webhook: HMAC-SHA256, idempotent, created/paid/cancelled/returned; simulator + script
- SaleRecordedEvent decouples Sales from Forecasting
- POS, order history, return and simulator UI

Tests: Seq3SalesTest, WebhookSecurityTest, SalesConcurrencyTest
```

### Module 6 — Stavan — `module-6-forecasting`
```
feat(forecast): predictive analytics and AI forecasting [SRS 4.6]

- Holt-Winters additive forecast with seasonal-naive fallback and seasonality detection
- Reorder recommendations from supplier lead time; one-click draft PO
- Revenue (channel/location/period) and stock analytics; forecast-vs-actual accuracy from SaleRecordedEvent
- Forecast page: demand, reorder, accuracy, revenue, stock

Tests: ForecastTest
```

### Module 7 — Dev — `module-7-notifications`
```
feat(notifications): multimodal notification inbox and preferences [SRS 4.7]

- Inbox with unread/read status, mark as read, live alerts from /ws/alerts
- Per-type channel preferences (e-mail, SMS, audio) with GET/PUT /notifications/preferences
```

### Module 8 — Stavan — `module-8-platform-hardening`
```
feat(platform): demo data, non-functional tests, scripts and documentation

- DemoDataSeeder (demo profile): 5 suppliers, 31 SKUs, 62 stock rows, POs and 443 sales over 52 weeks
- NFR tests, class-contract and class-diagram-structure tests (12 classes, 43 operations, 9 relationships)
- scripts: smoke_test.sh (53 live API checks), load_test.sh
- README, traceability matrix (SRS -> use case -> class -> DFD -> code -> test), class-diagram mapping
- Experiment 8 report (docx + pdf)

Tests: NfrTest, ClassContractTest, ClassDiagramStructureTest
```

---

## 5. Building and running: Windows notes

| Problem | Cause | Fix |
|---------|-------|-----|
| `class file version 65.0 ... only recognizes up to 61.0` | The project targets **Java 21**; the shell is on JDK 17 | `export JAVA_HOME="C:/Program Files/Java/jdk-21"` (any JDK 21+ works) |
| App crashes on start: `Unable to establish loopback connection` | Java's NIO selector fails when `%TEMP%` contains a **space** (user folder `Dev Gaglani`) | Use a temp folder without spaces: `mkdir C:\tmpj`, set `TEMP=C:\tmpj TMP=C:\tmpj`, run Java with `-Djava.io.tmpdir=C:\tmpj`. Docker is unaffected. |
| `FATAL: role "isms" does not exist` | Local Postgres has no project user | `CREATE ROLE isms LOGIN PASSWORD 'isms' CREATEDB; CREATE DATABASE isms OWNER isms;` or use Docker |
| `/actuator/health` says `DOWN` locally | The mail health check fails when Mailpit is not running | Harmless; `docker compose up` includes Mailpit |

**Easiest:** `docker compose up --build -d` → http://localhost:3000 (UI), http://localhost:8080/swagger-ui/index.html (API), http://localhost:8025 (Mailpit).
**Without Docker:** local Postgres, then `cd backend && SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run` and `cd frontend && npm run dev`.
Accounts (password `Password123!`): `USR-ADMIN-1`, `USR-MGR-1`, `USR-WH-1`, `USR-SALES-1`.

---

## 6. Verifying everything before you start

```bash
python scripts/module_split.py check          # every file belongs to exactly one module
python scripts/module_split.py verify         # builds modules 1..8 cumulatively in a temp dir:
                                              #   backend test-compile + frontend tsc at every stage
python scripts/module_split.py verify --tests # also runs the tests at every stage (needs Postgres)
bash scripts/smoke_test.sh                    # 53 live API checks against a running demo backend
```

## 7. Look and feel

Teal/emerald brand with an isometric cube logo; light theme and a neutral **black** dark theme (`#0a0a0a`, teal accent). The sun/moon toggle remembers the choice and follows the OS on first visit. All colours are CSS variables in `frontend/src/index.css`; status colours swap automatically.
