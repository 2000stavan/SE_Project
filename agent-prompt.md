# agent-prompt.md — Prompt for the coding agent (Spring Boot edition)

Before running: create a folder `isms/` and place these files in it: `plan.md`, `feature.md`, `schema.md`, `api-spec.md`, `implementationplan.md`, plus a `docs/source/` folder with the SRS PDF, class diagram image, the sequence-diagram document and the DFD document.

---

You are a senior full-stack engineer. Build the **Inventory and Stock Management System (ISMS)** in the current repository, working autonomously until it runs end-to-end.

## Read first, in this order
1. `plan.md` (scope, authority hierarchy, decisions, phases)
2. `feature.md` (what to build, tiers, acceptance)
3. `schema.md` (database; STRICT)
4. `api-spec.md` (endpoints and the exact service method names to call)
5. `implementationplan.md` (stack, layout, build order, tests, demo)
6. `docs/source/*` (SRS is the main reference; consult it whenever a requirement is ambiguous)

## Non-negotiable rules
- **Authority order:** SRS > class diagram > DFD > sequence diagrams > `plan.md` decisions. If two sources conflict, follow `plan.md` §6; if still unclear, choose the simplest option, note it in `DECISIONS.md`, and continue. Do not stop to ask unless blocked.
- **Database = `schema.md` exactly.** Eight class tables plus the two junction tables, with only the three deviations D-1, D-2, D-3 listed there. Do not add tables or columns. Put the DDL in Flyway `V1__init.sql`, map JPA entities exactly to it, run Hibernate with `ddl-auto=validate`, and write `SchemaMatchesSpecTest`.
- **Method names = class diagram.** Each class-diagram operation (e.g. `StockRecord.update_stock`, `PurchaseOrder.receive_confirm`, `SalesOrder.generate_invoice`) must exist as a public method on the matching service class (`StockRecordService.updateStock`, `PurchaseOrderService.receiveConfirm`, `SalesOrderService.generateInvoice`) using the mechanical snake_case → camelCase conversion described in `implementationplan.md` §2.1, and every API route in `api-spec.md` must call it. Add `ClassContractTest`.
- **Implement the three sequence diagrams exactly** (Inventory Management, Manage Purchase Order, Process Sales), including every `alt`/`opt`/`loop` branch. Record a per-request call trace (`CallTraceAspect`) and write one integration test per sequence (`Seq1InventoryTest`, `Seq2PurchaseOrderTest`, `Seq3SalesTest`) asserting message order and each branch.
- **Stack (fixed):** Java 21, Maven, Spring Boot 3.3.x (Web, Security, Data JPA, Validation, WebSocket, Mail), Flyway, PostgreSQL 16, JWT + BCrypt, OpenPDF, JUnit 5 + Testcontainers; frontend React + Vite + TypeScript + Tailwind; Docker Compose with Mailpit. Do not substitute technologies and do not add Python services.
- All stock changes go through `StockRecordService.updateStock()` / `deductStock()` with pessimistic row locks; stock must never go negative (BR-3).
- External services (marketplaces, payment, SMS, STT/TTS, ML) are adapters behind interfaces; HMAC webhook verification is real, everything else may be a local stub. Forecasting is an in-process Holt-Winters implementation behind `ForecastingService`.
- Never hardcode secrets; use `application.yml` with environment overrides and `.env.example` as in `implementationplan.md` §3.

## Work plan
Follow phases P0 → P7 in `plan.md` §4 and the build order in `implementationplan.md` §4. Finish **all Tier 1 features** (F1, F2, C1, C2, C3) before starting Tier 2 (E1 forecasting/dashboards, E2 admin, E3 extras). Then do as many Tier 2/3 items as time permits.

After each phase: run `./mvnw verify` (and the frontend tests), fix failures, commit with message `P<n>: <summary>`, and append a short entry to `PROGRESS.md` (what is done, what is next, known gaps). Use a task list to track progress.

## Frontend requirements
Role-based navigation for Administrator / Manager / Warehouse Staff / Sales Personnel; inline form validation; contextual help link on every page; voice page with listening / processing / confirmed indicator, spoken read-back using `speechSynthesis`, typed-command fallback and offline queue; POS page that accepts barcode-scanner (keyboard-wedge) input; live stock updates over WebSocket; notification inbox; dashboards with charts (Tier 2). Keep the UI clean and consistent; no placeholder pages for Tier 1.

## Deliverables
1. Working app via `docker compose up` plus `make seed` (demo data per `schema.md` §7, including 12 months of seasonal sales history, loaded by a `demo`-profile `DemoDataSeeder`).
2. Passing tests: `SchemaMatchesSpecTest`, `ClassContractTest`, the 3 sequence tests, `RbacMatrixTest`, `StockConcurrencyTest`, `PoStateMachineTest`, `WebhookSecurityTest`, `VoiceInterpreterTest`, NFR tests.
3. `scripts/simulate_marketplace.sh` (signed webhook sender using curl + openssl).
4. `README.md` with setup, demo accounts for all four roles, and the demo script from `implementationplan.md` §6.
5. `docs/traceability.md` mapping every SRS requirement tag in `feature.md` to code file(s) and test(s), marking anything not done.
6. `DECISIONS.md` listing any assumption you made beyond `plan.md` §6.

## Definition of done
Everything in `plan.md` §7 is true, the demo script runs start to finish without manual DB edits, and `docs/traceability.md` shows Tier 1 at 100%.

Begin now: read the files, state your understanding of the plan in 10 lines, then start Phase P0.
