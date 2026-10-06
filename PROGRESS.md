# ISMS Project Progress

## Phase Tracking

- [x] **P0 Setup**: Scaffolding, Docker Compose, Makefile, backend Spring Boot 3.3.5, frontend React + Vite, test tooling, health checks.
- [ ] **P1 Schema + Auth (F1)**: Flyway `V1__init.sql` from `schema.md`, JPA entities (`ddl-auto=validate`), `SchemaMatchesSpecTest`, JWT auth, lockout, password reset, demo seeds.
- [ ] **P2 Inventory (C1) + Notifications (F2)**: Product/Stock CRUD, row locking, WebSocket sync, voice interpretation and confirmation, low-stock notifications (`Seq1InventoryTest`).
- [ ] **P3 Supplier + Purchase Orders (C2)**: Supplier CRUD, PO lifecycle, approvals, receipts, overdue detection (`Seq2PurchaseOrderTest`).
- [ ] **P4 Sales (C3)**: Physical sale, webhook HMAC verification, stock deductions, PDF invoice generation, returns (`Seq3SalesTest`).
- [ ] **P5 Forecast + Dashboards (E1)**: In-process Holt-Winters forecasting, reorder recommendations, analytics dashboards.
- [ ] **P6 Admin + Polish (E2, E3)**: User/role management, marketplace simulation, contextual help, empty/error UI states.
- [ ] **P7 Hardening + Docs**: Traceability matrix, NFR validation, final documentation and demo walkthrough verification.

---

### P0: Setup Completed
- **Done**:
  - Configured workspace and mirrored specifications in `isms/`.
  - Installed Maven and OpenJDK 21 toolchain.
  - Initialized Git repository with comprehensive `.gitignore`.
  - Created backend Spring Boot 3.3.5 project with JPA, Security, Validation, WebSocket, Mail, Actuator, Flyway, and PostgreSQL driver.
  - Added Maven wrapper (`./mvnw`).
  - Added base `application.yml`, typed `AppProperties`, and `HealthController` (`/health`).
  - Created React 18 + Vite + TypeScript + Tailwind CSS frontend shell with test setup.
  - Added `docker-compose.yml` for PostgreSQL, Mailpit, backend, and frontend.
  - Added `Makefile` and `scripts/simulate_marketplace.sh`.
  - Verified backend test suite and frontend build/tests are green.
- **Next**:
  - Phase P1: Schema migration (`V1__init.sql`), JPA entities matching `schema.md`, `SchemaMatchesSpecTest`, Spring Security 6 with JWT & BCrypt, 30-min idle timeout, 5-attempt/15-min lockout, and password reset via Mailpit.
- **Known gaps**:
  - Database schema and security filter chain to be wired in P1.
