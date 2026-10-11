# ISMS — Module-by-Module GitHub Hand-off

> Moving the finished project into a **new repository**, one module at a time, alternating pushes.
> **Dev Gaglani** pushes the **odd** modules (1, 3, 5, 7, 9) · **Stavan Desai** pushes the **even** modules (2, 4, 6, 8).
> Every module is a self-contained push: after each one, the repo still compiles (backend + frontend). This was verified for all nine stages.

---

## 1. The nine modules

| # | Pusher | Module | What it adds | Tests it brings |
|---|--------|--------|--------------|-----------------|
| **1** | **Dev** | **Foundation & Data Layer** | Maven/Spring Boot skeleton, Docker + Compose, Flyway migrations V1–V6, **all** JPA entities & repositories, error handling, call tracing, mail adapter, frontend build config, `api/client.ts`, design-system CSS (teal brand, light + neutral-black dark themes), favicon, `moodle/moodle.md` + design docs (`schema.md`, `feature.md`, `api-spec.md`, SRS PDFs) | `SchemaMatchesSpecTest` |
| 2 | Stavan | Auth, RBAC, Audit & App Shell | JWT login, 5-fail lockout, password reset, 4 roles, sliding 30-min session, audit log, user admin, settings; React shell: `App.tsx`, sidebar `Layout`, `Logo`, light/dark `ThemeToggle`, Login, Password-reset, **Dashboard (live KPIs)**, User Admin, Audit Log, role onboarding walkthrough | `AuthIntegrationTest`, `BcryptTest`, `RbacMatrixTest`, `AdminTest`, `HealthControllerTest` |
| **3** | **Dev** | **Notifications & Real-time Channels** | In-app/e-mail/SMS/audio notifications, per-type preferences, `/ws/alerts` + `/ws/stock` WebSockets, stub channel adapters; Notifications + Preferences pages | — |
| 4 | Stavan | Inventory & Stock (C1) | Product CRUD with guarded delete, stock update under row lock, BR-3 no-negative-stock, low-stock alert trigger, real-time sync; Inventory page (with *Reserved* column) | `StockConcurrencyTest` |
| **5** | **Dev** | **Suppliers (C2a)** | Supplier CRUD, ranking by rating, performance tracking (BR-4), history endpoint, deactivation guard (BR-5); Suppliers page with performance-history modal | — |
| 6 | Stavan | Purchase Orders, Receiving & Voice (C2b, C1.7) | 6-state PO lifecycle, manager approval limit + supplier credit limit (BR-2), reject-to-Draft, partial receipt, overdue detection; voice commands with read-back confirmation; PO + Voice pages | `Seq1InventoryTest`, `Seq2PurchaseOrderTest`, `PoStateMachineTest`, `VoiceInterpreterTest` |
| **7** | **Dev** | **Forecasting & Analytics (E1)** | Holt-Winters demand forecast, seasonality, reorder recommendations, one-click draft PO, revenue & stock analytics, forecast-accuracy tracking; Forecast page (5 tabs) | `ForecastTest` |
| 8 | Stavan | Sales, POS & Marketplace Webhooks (C3) | Physical sale, atomic stock deduction, PDF invoice, HMAC-verified idempotent marketplace webhook, returns, marketplace simulator; POS page + `simulate_marketplace.sh` | `Seq3SalesTest`, `WebhookSecurityTest` |
| **9** | **Dev** | **Demo Data, Hardening & Docs** | `DemoDataSeeder` (31 SKUs, 5 suppliers, 443 orders, 52 weeks of history), NFR tests, class-contract + class-diagram-structure tests, load + smoke scripts, traceability matrix, **class-diagram mapping**, README, this guide | `NfrTest`, `ClassContractTest`, `ClassDiagramStructureTest` |

Why this order: it follows the real dependency chain. Entities/repositories sit in module 1 so nothing later breaks `ddl-auto: validate`; Notifications (3) comes before Inventory (4) because stock changes raise low-stock alerts; Suppliers (5) before POs (6); Forecast (7) before Sales (8) because every sale feeds forecast-accuracy tracking.

---

## 2. One-time setup (Dev, before module 1)

```bash
# 1. a fresh empty repo on GitHub (no README), then clone it next to the finished project
git clone https://github.com/<owner>/<new-repo>.git isms-new
cd isms-new
git config user.name  "Dev Gaglani"
git config user.email "dev.gaglani1@gmail.com"

# 2. add Stavan as a collaborator (Settings -> Collaborators) so both can push
```

The finished project stays in `se-proj/` (the old repo). `isms-new/` is where the history is built.
`se-proj/scripts/module_split.py` copies the right files into `isms-new/` for you.

> `moodle/moodle.md` (the consolidated SRS, use cases, class/sequence/DFD notes and WBS) **is** copied, in module 1, and is the single source of truth for requirements. Not copied on purpose: the seven course PDFs in `moodle/` (`docs/source/` already has the SRS, DFDs and class diagram) and `isms/` (a stale duplicate of the design docs).

---

## 3. The loop for every module

Same six steps, whoever's turn it is. **Strictly alternate** — don't start module *N+1* until module *N* is on `main`.

```bash
# in isms-new/
git checkout main && git pull                         # 1. get the other person's module

git checkout -b module-<N>-<slug>                      # 2. branch (slugs are in the table in §4)

python ../se-proj/scripts/module_split.py apply <N> .  # 3. copy module N's files in
                                                       #    (also regenerates App.tsx / Layout.tsx for modules 1..N)

# 4. prove it builds (see §5 for the Windows notes)
(cd backend  && ./mvnw -q test-compile)                # or: ./mvnw test   once the DB is available
(cd frontend && npm ci && npx tsc --noEmit)            # from module 2 onward

git add -A                                             # 5. commit with the message from §4
git commit -F - <<'MSG'
<message from section 4>
MSG

git push -u origin module-<N>-<slug>                   # 6. open a PR -> merge to main (the other person reviews)
```

Rules of thumb:
- **One commit per module** (a PR with a single commit). Use the exact message in §4 so the history reads like the architecture.
- Never edit `App.tsx` / `Layout.tsx` by hand — `apply` rewrites them so they only reference pages that already exist in the repo.
- If `apply` reports nothing to copy, you probably ran it for the wrong module number.
- `python ../se-proj/scripts/module_split.py list` shows owners and file counts; `check` proves every file belongs to exactly one module.

---

## 4. Branch names and commit messages

### Module 1 — Dev — `module-1-foundation`
```
feat(foundation): project skeleton, schema and data layer

- Spring Boot 3.3 / Java 21 backend, React + Vite + Tailwind frontend, Docker Compose (Postgres, Mailpit)
- Flyway V1-V6: 10 core tables, reference seed, notification READ status, sales line-item PK fix,
  notification preferences, forecast accuracy
- JPA entities + repositories for every table (ddl-auto: validate)
- Global error handling, call-trace aspect for sequence-diagram tests, SMTP mailer adapter
- Design-system CSS with light and black dark themes, ISMS cube favicon
- Requirements: moodle/moodle.md (consolidated SRS/use cases/UML/DFD/WBS), SRS, DFDs, class diagram, schema.md, feature.md, api-spec.md

Tests: SchemaMatchesSpecTest
```

### Module 2 — Stavan — `module-2-auth-audit-shell`
```
feat(auth): JWT auth, RBAC, audit log, user admin and app shell [F1, E2]

- Login with 5-fail/15-min lockout, e-mail password reset, 4 roles, sliding 30-min session
- Structured audit log (SE-5) + Administrator audit viewer
- User admin: create, change role, deactivate, unlock; read-only system settings
- React shell: sidebar layout with ISMS logo, light/dark theme toggle, protected + role-guarded routes,
  live dashboard, password-reset page, role onboarding walkthrough, help button

Tests: AuthIntegrationTest, BcryptTest, RbacMatrixTest, AdminTest, HealthControllerTest
```

### Module 3 — Dev — `module-3-notifications`
```
feat(notifications): alerts, preferences and WebSocket channels [F2]

- E-mail (Mailpit), SMS stub and audio alerts; every notification logged with READ/UNREAD status
- Per-type channel preferences (GET/PUT /notifications/preferences)
- /ws/alerts and /ws/stock real-time handlers
- Notifications inbox and Preferences pages
```

### Module 4 — Stavan — `module-4-inventory`
```
feat(inventory): product and stock management [C1]

- Product search/create/update/guarded delete (409 when stock or history exists)
- Stock update under pessimistic row lock; BR-3 never below zero
- Low-stock notification trigger and real-time stock sync
- Inventory page with stock-on-hand and reserved columns

Tests: StockConcurrencyTest
```

### Module 5 — Dev — `module-5-suppliers`
```
feat(suppliers): supplier management and performance history [C2]

- Supplier create/edit/search ranked by rating (Administrator and Manager)
- BR-4 rating recalculation on PO close; /suppliers/{id}/history with on-time rate
- BR-5 deactivation blocked while POs are open
- Suppliers page with performance-history modal
```

### Module 6 — Stavan — `module-6-purchase-orders-voice`
```
feat(po): purchase-order lifecycle, receiving and voice commands [C2, C1.7]

- Draft -> Pending Approval -> Approved -> Partially Received -> Received / Cancelled, illegal transitions rejected
- BR-2 manager approval limit and supplier credit limit; reject returns PO to Draft and notifies
- Partial receipt updates stock; overdue detection raises shipping-delay alerts
- Voice capture -> interpret -> read-back -> confirm, with confidence threshold
- Purchase Orders and Voice pages

Tests: Seq1InventoryTest, Seq2PurchaseOrderTest, PoStateMachineTest, VoiceInterpreterTest
```

### Module 7 — Dev — `module-7-forecast-analytics`
```
feat(forecast): demand forecasting, reorder suggestions and analytics [E1]

- Holt-Winters additive forecast with seasonal-naive fallback
- Reorder recommendations using supplier lead time; one-click draft PO
- Revenue (channel/location/period) and stock analytics; forecast-vs-actual accuracy tracking
- Forecast page: demand, reorder, accuracy, revenue, stock

Tests: ForecastTest
```

### Module 8 — Stavan — `module-8-sales-pos`
```
feat(sales): POS, invoices and marketplace webhooks [C3]

- Physical sale with atomic stock deduction; insufficient stock rejected and manager notified
- PDF invoice generation (OpenPDF); returns restore stock
- Marketplace webhook: HMAC-SHA256 verification, idempotent, created/paid/cancelled/returned
- POS, order history, return and marketplace-simulator UI; simulate_marketplace.sh

Tests: Seq3SalesTest, WebhookSecurityTest
```

### Module 9 — Dev — `module-9-demo-hardening-docs`
```
feat(demo): demo data, NFR tests, scripts and documentation

- DemoDataSeeder (demo profile): 5 suppliers, 31 SKUs, 62 stock rows, POs, 443 sales over 52 weeks
- NFR tests (sync latency, lockout, session, voice throughput) and class-contract test
- scripts/load_test.sh, scripts/smoke_test.sh (end-to-end API check, 50 assertions)
- docs/class-diagram-mapping.md: all 12 classes, 43 operations, 9 relationships -> entity/service/API/UI/test
- README, traceability matrix (SRS tag -> code -> test), PROGRESS.md

Tests: NfrTest, ClassContractTest, ClassDiagramStructureTest
```

After merging module 9: `git tag v1.0 && git push --tags`.

---

## 5. Building and running — Windows notes (these cost us time)

| Problem | Cause | Fix |
|---------|-------|-----|
| `class file version 65.0 ... only recognizes up to 61.0` | The project targets **Java 21**; the shell is on JDK 17 | `export JAVA_HOME="C:/Program Files/Java/jdk-21"` (any JDK 21+; JDK 23 works) before `./mvnw` |
| App crashes on start: `Unable to establish loopback connection` | Java's NIO selector breaks when `%TEMP%` contains a **space** (user folder `Dev Gaglani`) | Use a temp dir without spaces: `mkdir C:\tmpj`, then set `TEMP=C:\tmpj TMP=C:\tmpj` and run Java with `-Djava.io.tmpdir=C:\tmpj`. Docker is unaffected. |
| `FATAL: role "isms" does not exist` | Local Postgres has no project user | `CREATE ROLE isms LOGIN PASSWORD 'isms' CREATEDB; CREATE DATABASE isms OWNER isms;` — or just use Docker |
| `/actuator/health` says `DOWN` locally | The mail health check fails when Mailpit isn't running | Harmless; `docker compose up` includes Mailpit |

**Easiest path (no local setup):** `docker compose up --build -d`, then open http://localhost:3000 (UI), http://localhost:8080/swagger-ui.html (API), http://localhost:8025 (Mailpit).

**Without Docker:** local Postgres + `cd backend && SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run` and `cd frontend && npm run dev`.

Sign-in accounts (password `Password123!`): `USR-ADMIN-1`, `USR-MGR-1`, `USR-WH-1`, `USR-SALES-1`.

---

## 6. Verifying everything before you start

```bash
python scripts/module_split.py check                 # 172 files, 0 unassigned, 0 duplicated
python scripts/module_split.py verify                # builds modules 1..9 cumulatively in a temp dir:
                                                     #   backend test-compile + frontend tsc at every step
python scripts/module_split.py verify --tests        # same, but runs the module's tests at every step (needs Postgres)
bash scripts/smoke_test.sh                           # 50 live API checks against a running demo backend
```

## 7. Presenting to the teacher — 5-minute script

1. **Dashboard** (Admin): live stock/revenue KPIs, revenue-by-channel chart, low-stock list.
2. **Inventory** (Warehouse): add a product, adjust stock below its reorder point → a **low-stock alert** appears under Notifications (try a second tab: it arrives live).
3. **Voice**: type "add 20 units of <SKU>" → read-back → confirm.
4. **Forecast** (Manager): *Reorder* tab → *Create Draft PO* for a low-stock SKU.
5. **Purchase Orders**: submit → approve (try a PO above the manager limit as Manager: blocked; Admin: allowed) → receive → stock increases; reject one to show the reason notification.
6. **Sales** (Sales): ring up a sale → download the PDF invoice → return it → stock restored. *Marketplace* tab: send an HMAC-signed order.
7. **Admin**: User Admin (create user, change role, lock-out after 5 bad logins and unlock), **Audit Log** showing all of it, Suppliers → performance history.
8. **Forecast → Forecast Accuracy**: predicted vs actual chart. Close with `docs/traceability.md` (every SRS requirement → file → test).

## 8. Look and feel

- **Brand:** teal/emerald (stock-in-hand green), with an isometric cube logo (`components/Logo.tsx`, `public/favicon.svg`) instead of the old purple "IS" tile.
- **Themes:** light, and a neutral **black** dark theme (`#0a0a0a` canvas, teal accent). The toggle (sun/moon, top right and on the login page) remembers the choice and follows the OS setting on first visit. All colours are CSS variables in `frontend/src/index.css`; status colours (`--c-ok-*`, `--c-warn-*`, `--c-err-*`) swap automatically.
