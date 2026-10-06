# plan.md — ISMS Implementation Plan (Project Plan)

Project: **Inventory and Stock Management System (ISMS)** — Release 1.0
Team: Stavan Desai (2024300042), Dev Gaglani (2024300057), SPIT

## 1. Objective

Build a working, demo-ready web application that implements the ISMS SRS, with three mandatory core modules (those in the sequence diagrams) plus as many additional SRS features as time allows.

## 2. Authority hierarchy (what wins when documents disagree)

1. **SRS** — functional scope, rules, priorities, enumerations. Main reference.
2. **Class diagram** — database schema, class/method names, associations (strict).
3. **DFD (L0/L1/L2)** — data stores, process decomposition, data flows, build order of services.
4. **Sequence diagrams** — exact message order of the three required use cases.
5. This plan's decisions (Section 6) only where 1–4 are silent.

## 3. Scope

### 3.1 Mandatory core modules (from the sequence diagrams)

| # | Module | Sequence | DFD process | Classes |
|---|---|---|---|---|
| C1 | **Inventory Management** (+ voice, sync, low-stock alert) | Seq 1 | 4.0 (4.1–4.5), 7.0 | Product, StockRecord, WarehouseStaff, Notification |
| C2 | **Manage Purchase Order** (+ Supplier) | Seq 2 | 6.0, 2.0 (supplier part) | Supplier, Product, PurchaseOrder, Manager, WarehouseStaff |
| C3 | **Process Sales** | Seq 3 | 3.0 (3.1–3.6) | SalesPersonnel, Product, SalesOrder, StockRecord |

### 3.2 Foundation required by the core (must exist first)

| # | Module | DFD | Why |
|---|---|---|---|
| F1 | **Authentication & RBAC** | 1.0 | Every sequence starts with an authenticated role; SRS 4.1 is High priority |
| F2 | **Notifications** | 7.0 | Seq 1 `alt` branch calls `trigger_low_stock()` / `send_audio_alert()`; Seq 2 overdue; Sales insufficient stock |

### 3.3 Extra modules (implemented if the core is green)

| # | Module | DFD | Classes |
|---|---|---|---|
| E1 | **Forecasting & Analytics dashboards** (SRS 4.6) | 5.0 | Forecast |
| E2 | **User & supplier administration** (SRS 4.1/4.3 admin parts) | 2.0 | Administrator |
| E3 | **Marketplace simulator + webhook hardening** | 3.0 | SalesOrder |

### 3.4 Explicitly out of scope for this submission

Native mobile apps, multilingual voice, real marketplace/payment/SMS integrations (all stubbed behind interfaces), notification preferences table, settings table, audit-log table, hardware barcode scanners (HI-2 is simulated with keyboard-wedge input), multi-warehouse location master data (a location is just a string id per the class diagram).

## 4. Phased roadmap

Each phase ends with passing tests and a git commit/tag. Phases are ordered by dependency.

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **P0 Setup** | Repo, Docker Compose (Postgres, backend, frontend, Mailpit), CI-less `make` targets, lint/test tooling | `docker compose up` shows health OK and empty UI shell |
| **P1 Schema + Auth (F1)** | Flyway `V1__init.sql` from `schema.md` + JPA entities (`ddl-auto=validate`), seeds, JWT login, Spring Security role checks, lockout, session timeout, password reset | Login works for 4 roles; forbidden routes return 403 |
| **P2 Inventory (C1) + Notifications (F2)** | Product/Stock CRUD, search, row-lock updates, WS sync, voice interpret/confirm, low-stock alert + audio | **Sequence 1 test passes end-to-end** |
| **P3 Supplier + Purchase Orders (C2)** | Supplier CRUD/performance, PO lifecycle, approve/reject, partial/full receipt, overdue job | **Sequence 2 test passes** (approve, reject and overdue branches) |
| **P4 Sales (C3)** | Physical sale, webhook with HMAC, mock payment, stock deduct, invoice PDF, return | **Sequence 3 test passes** (processed, not-processed, return) |
| **P5 Forecast + Dashboards (E1)** | Forecast service, reorder suggestions → pre-filled PO, revenue & stock dashboards | Dashboards render seeded data; forecast job < 30 min bound (trivially) |
| **P6 Admin + polish (E2, E3)** | User/role admin, supplier deactivate, simulator, onboarding/help, empty/error states | Demo script runs without manual DB edits |
| **P7 Hardening + docs** | NFR checks, README, API docs, demo script, requirements-traceability report | All items in Section 7 ticked |

Suggested split between the two of you: **Stavan**: P1, P3, P5 (backend). **Dev**: P2, P4 and the frontend shells; swap on P6/P7. Agree on `api-spec.md` first so both can work in parallel.

## 5. Deliverables checklist

- [ ] Running application (`docker compose up`)
- [ ] Database migrations + seed script (derived from `schema.md`)
- [ ] 3 sequence-diagram integration tests + unit tests
- [ ] Role-based UI (4 dashboards)
- [ ] Voice demo page with fallback
- [ ] Marketplace simulator script
- [ ] `README.md` (setup, demo accounts, demo script)
- [ ] `docs/traceability.md` (SRS tag → code → test), generated at the end by the agent
- [ ] Source documents copied to `docs/source/` (SRS, class diagram, sequence, DFD)

## 6. Decisions on gaps / contradictions found in the documents

| # | Finding | Decision |
|---|---|---|
| D1 | SRS Appendix B shows two PO state diagrams (Draft→Pending→Approved→Partially/Received/Cancelled vs Draft→Sent→Confirmed→…→Closed). | Use the SRS §4.4 / data-dictionary six statuses only. |
| D2 | Class diagram has no status on Supplier, no date on SalesOrder. | Add minimal columns D-1, D-2 in `schema.md` (flagged for sign-off). |
| D3 | `PurchaseOrder.line_items` / `SalesOrder.line_items` are lists. | Junction tables (D-3). |
| D4 | `Notification.recipients: List` vs diagram "User 1 receives 0..* Notification". | One notification row per recipient & channel with `user_id` FK. |
| D5 | Sequence 2 shows `Manager.approve_po()` before `PurchaseOrder.approve()`; SRS also lets Administrator approve. | Both roles allowed; Manager restricted by `APPROVAL_LIMIT_MANAGER`; Admin unlimited. BR-2 credit check applies to both. |
| D6 | Sequence 3 shows `process_webhook()` inside the *physical* flow; SRS separates physical vs webhook. | Implement both paths. Physical: `log_physical_sale → create_order → deduct → generate_invoice`. Webhook: `process_webhook → create_order → reserve → deduct on paid → generate_invoice`. Both reachable in the same `alt` "order can be processed". |
| D7 | Sequence 1 `delete()` vs SRS "deactivate a SKU only with zero stock". | `Product.delete()` = guarded hard delete (zero stock everywhere, no PO/sales references, else 409). Avoids adding an `is_active` to Product. |
| D8 | PO rejection reason has no column. | Sent as `Order Update` notification to the owning Manager. |
| D9 | Class diagram has no `Location` class. | `location_id` is a plain string (`WH-01`, `STORE-01`). |
| D10 | STT/TTS engine unspecified (TBD-1/TBD-4). | Browser Web Speech API behind a `SpeechProvider` interface; server receives text + confidence. Mock provider for tests. |
| D11 | ML algorithm unspecified (TBD-3). | In-process additive Holt-Winters (Java, behind `ForecastingService`) with a seasonal-naive fallback when history < 2 cycles. |
| D12 | Audit log required (SE-5) but no class. | Structured JSON log file; not in DB. |
| D13 | Data dictionary table references are labelled "Hotel Database" in one SRS figure. | Treated as a typo for "ISMS Database". |

## 7. Definition of Done

1. Every item in `feature.md` marked **Tier 1** works through the UI **and** API.
2. The three sequence diagrams are reproduced as integration tests that assert the same message order (via recorded service-call trace) and both branches of every `alt`/`opt`.
3. DB schema in the running database equals `schema.md` (schema-diff test).
4. Class method names in code equal class-diagram names, converted snake_case → camelCase (`ClassContractTest` introspects via reflection).
5. SRS numeric requirements verified: 5 s sync, 5 failed logins/15 min lock, 30 min timeout, 100 concurrent voice commands < 3 s (simple load test), webhook < 10 s.
6. No negative stock reachable by any path (concurrency test).

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Web Speech API unsupported (Firefox) | Voice demo fails | Typed-command box feeds the same interpreter; Chrome/Edge is the demo browser (SRS CO-4 fallback is a feature). |
| Race conditions on stock | Wrong numbers in demo | Row locks + concurrency test (Section 7.6). |
| Scope creep | Core unfinished | Tier gates in `feature.md`; Tier 2 starts only when Tier 1 tests are green. |
| Forecast quality | Looks random | Seed data with clear weekly/yearly seasonality. |
| Agent deviates from schema | Evaluation mismatch | Schema-diff test + class-contract test in CI. |

## 9. Companion documents

`feature.md` (what), `schema.md` (database), `api-spec.md` (endpoints), `implementationplan.md` (how: stack, architecture, steps, tests), `agent-prompt.md` (prompt for the coding agent).
