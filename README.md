# Inventory and Stock Management System (ISMS)

Full-stack inventory platform for multi-channel commerce: real-time stock sync, voice-directed stock updates, purchase-order approval workflows, POS with PDF invoices, HMAC-verified marketplace webhooks, and Holt-Winters demand forecasting.

## 1. Stack

- **Backend:** Java 21, Spring Boot 3.3.5, Spring Data JPA, Spring Security (stateless JWT), Flyway, PostgreSQL 16.
- **Frontend:** React 18, Vite, TypeScript, Tailwind, Recharts.
- **Security:** 30-min sliding session, 5-fail/15-min lockout, BCrypt, HMAC-SHA256 webhooks, RBAC for 4 roles, audit log.
- **Integrity:** pessimistic row locks (stock never negative, BR-3), idempotent webhooks, guarded PO state machine.
- **Real-time:** WebSockets `/ws/stock`, `/ws/alerts`.

## 2. Quick start

```bash
docker compose up --build -d     # or: make up
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| REST API / Swagger | http://localhost:8080 / http://localhost:8080/swagger-ui.html |
| Mailpit (e-mails) | http://localhost:8025 |

The backend runs with the `demo` profile, which seeds 5 suppliers, 31 SKUs, purchase orders and ~443 sales over 52 weeks.

Without Docker: local Postgres (`isms`/`isms`), then `cd backend && SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run` and `cd frontend && npm install && npm run dev`. Windows notes (Java 21, TEMP path with spaces) are in `github.md` §5.

## 3. Demo accounts (password `Password123!`)

| Role | User ID | E-mail | Can do |
|---|---|---|---|
| Administrator | `USR-ADMIN-1` | admin@isms.com | everything: users/roles, unlock, audit log, deactivate suppliers, unlimited PO approval |
| Manager | `USR-MGR-1` | manager1@isms.com | suppliers, PO approval (up to the manager limit, default 100,000), forecasts, analytics |
| Warehouse Staff | `USR-WH-1` | warehouse1@isms.com | stock updates, voice commands, receiving POs |
| Sales Personnel | `USR-SALES-1` | sales1@isms.com | POS, invoices, returns |

## 4. Tests

```bash
cd backend && ./mvnw test          # 70 tests (needs Postgres isms/isms on localhost:5432)
cd frontend && npm test            # Vitest
bash scripts/smoke_test.sh         # 53 live API checks against a running demo backend
./scripts/load_test.sh             # latency / concurrency benchmark (PE-1, PE-3)
```

## 5. Walkthrough

1. **Warehouse** – Voice page: "add 20 units of SKU-001 to location WH-01" → confirm. Drop stock below its reorder point: a low-stock alert appears under Notifications (live in a second tab, e-mail in Mailpit).
2. **Manager** – Forecast → Reorder → *Create Draft PO*. Purchase Orders: submit → approve (reject one with a reason → back to Draft).
3. **Warehouse** – receive the PO; stock rises and the supplier rating updates.
4. **Sales** – POS sale → download PDF invoice → return it. *Marketplace* tab (or `scripts/simulate_marketplace.sh`) sends an HMAC-signed order.
5. **Admin** – User Admin (create, change role, unlock after 5 bad logins), Audit Log, supplier performance history.
6. **Manager** – Forecast → Forecast Accuracy (predicted vs actual).

## 6. Design decisions

- PO rejection returns the PO to **Draft** with the reason notified (SRS §A8.1 followed over the use-case text).
- `open-in-view` is on: controllers serialize lazy associations after the service transaction.
- Unauthenticated/expired requests return **401** (the UI's session-timeout redirect depends on it); role violations return 403.

## 7. Documentation

`docs/traceability.md` maps every SRS requirement to code and tests. `docs/class-diagram-mapping.md` maps every class, operation and relationship of the UML class diagram to its entity, service, endpoint and UI page (checked by `ClassContractTest` and `ClassDiagramStructureTest`). `schema.md`, `feature.md`, `api-spec.md` hold the design. `github.md` is the module-by-module hand-off plan for the new repository.
