# ISMS Project Progress

## Phase Tracking

- [x] **P0 Setup**: Scaffolding, Docker Compose, Makefile, backend Spring Boot 3.3.5, frontend React + Vite, test tooling, health checks.
- [x] **P1 Schema + Auth (F1)**: Flyway `V1__init.sql` from `schema.md`, JPA entities (`ddl-auto=validate`), `SchemaMatchesSpecTest`, JWT auth, lockout (5 fails / 15m), sliding session timeout, password reset via Mailpit, RBAC matrix test, `ClassContractTest`.
- [ ] **P2 Inventory (C1) + Notifications (F2)**: Product/Stock CRUD, row locking, WebSocket sync, voice interpretation and confirmation, low-stock notifications (`Seq1InventoryTest`).
- [ ] **P3 Supplier + Purchase Orders (C2)**: Supplier CRUD, PO lifecycle, approvals, receipts, overdue detection (`Seq2PurchaseOrderTest`).
- [ ] **P4 Sales (C3)**: Physical sale, webhook HMAC verification, stock deductions, PDF invoice generation, returns (`Seq3SalesTest`).
- [ ] **P5 Forecast + Dashboards (E1)**: In-process Holt-Winters forecasting, reorder recommendations, analytics dashboards.
- [ ] **P6 Admin + Polish (E2, E3)**: User/role management, marketplace simulation, contextual help, empty/error UI states.
- [ ] **P7 Hardening + Docs**: Traceability matrix, NFR validation, final documentation and demo walkthrough verification.

---

### P1: Schema + Auth (F1) Completed
- **Done**:
  - Implemented Flyway `V1__init.sql` matching `schema.md` DDL verbatim (8 class tables + 2 junction tables).
  - Seeded reference accounts across all 4 roles in `V2__seed_reference.sql`.
  - Created JPA entities with `@Table` and `@Column` explicit bindings and Hibernate `ddl-auto=validate`.
  - Implemented `SchemaMatchesSpecTest` verifying database catalog against `expected-schema.json`.
  - Built Spring Security 6 stateless JWT architecture with BCrypt password encoding, 30-min sliding expiration header (`X-Refreshed-Token`), in-memory failed attempt cache (`LoginAttemptCache`) with 5 attempts / 15 min lockout (`ACCOUNT_LOCKED`), and password reset token flow.
  - Implemented `UserService` and `AdministratorService` implementing exact class-diagram operations.
  - Built `CallTrace` and `CallTraceAspect` for method call recording.
  - Created `ClassContractTest` reflectively asserting that all 12 class-diagram domain services and operations exist and are public.
  - Created `RbacMatrixTest` ensuring route-level permissions per `feature.md`.
  - Updated React frontend with `AuthProvider`, `LoginPage` (supporting 4-role 1-click login and manual inputs), and role-based `Layout` navigation.
  - Both `./mvnw verify` and `npm run build && npm test` pass 100%.
- **Next**:
  - Phase P2: Inventory (C1) + Notifications (F2) — Product & Stock CRUD, search, pessimistic row locks, WebSocket real-time sync (`/ws/stock`), voice grammar interpreter (`WarehouseStaff.capture_voice_command` + confirm), low-stock notification & audio alert, and `Seq1InventoryTest`.
- **Known gaps**:
  - Voice audio synthesis and WebSocket broadcast handlers to be activated in P2.
