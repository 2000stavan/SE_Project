# github2.md — Commit everything to the existing `lala` repo

> Repo: https://github.com/2000stavan/lala (branch `main`). You commit and push these changes yourself, in 10 commits.
> Every one of the 76 changed/new files is listed below — nothing is left out. A final check proves it.

## 0. Read this first: `origin/main` has a commit you don't have

Stavan pushed `01953dc feat: Role-based nav, dashboards, route guards + full UI beautification`. It rewrote three files that this work also changed:
`frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`, `frontend/src/index.css`.

Your working copies of those three files **already contain his work** (route guards, role hero + quick actions on the dashboard, his extra CSS classes) plus the new sidebar layout and dark mode, so yours are a strict superset. In step 3 you resolve the conflict by keeping yours.

## 1. Before you start

```bash
cd se-proj
git status --short | head          # you should see the modified/untracked files from the table below
git fetch origin
git log --oneline HEAD..origin/main   # shows only 01953dc
```

Optional safety net (keeps a copy of your work no matter what happens):

```bash
git branch backup-before-commits
```

Line-ending warnings (`LF will be replaced by CRLF`) are harmless.

## 2. The ten commits

Run them in order. Each block is copy-paste. (Git Bash or PowerShell; the `git commit -m` multi-line strings below use a here-doc — in PowerShell, replace them with one `-m` per line.)

### Commit 1 — Schema + entities + repositories (15 files)

```bash
git add \
  backend/src/main/resources/db/migration/V3__notification_read_status.sql \
  backend/src/main/resources/db/migration/V4__fix_sales_line_item_pk.sql \
  backend/src/main/resources/db/migration/V5__notification_preferences.sql \
  backend/src/main/resources/db/migration/V6__forecast_accuracy.sql \
  backend/src/main/java/com/isms/model/Notification.java \
  backend/src/main/java/com/isms/model/NotificationPreference.java \
  backend/src/main/java/com/isms/model/ForecastAccuracy.java \
  backend/src/main/java/com/isms/model/SalesOrderLineItemId.java \
  backend/src/main/java/com/isms/model/StockRecord.java \
  backend/src/main/java/com/isms/model/enums/NotificationStatus.java \
  backend/src/main/java/com/isms/repository/ForecastAccuracyRepository.java \
  backend/src/main/java/com/isms/repository/NotificationPreferenceRepository.java \
  backend/src/main/java/com/isms/repository/PoLineItemRepository.java \
  backend/src/main/java/com/isms/repository/SalesOrderLineItemRepository.java \
  backend/src/main/java/com/isms/repository/UserRepository.java
git commit -F - <<'MSG'
fix(db): notification READ status, sales line-item PK, preferences and forecast-accuracy tables

- V3 adds notification READ status; V4 fixes the sales line-item primary-key collision
- V5 notification_preferences; V6 forecast_accuracy
- New entities/repositories; existence queries replace findAll scans
- StockRecord.product no longer serialized (lazy proxy made GET /stock return 500)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 2 — Services (10 files)

```bash
git add \
  backend/src/main/java/com/isms/audit/AuditLogger.java \
  backend/src/main/java/com/isms/error/InsufficientStockException.java \
  backend/src/main/java/com/isms/domain/ForecastService.java \
  backend/src/main/java/com/isms/domain/NotificationService.java \
  backend/src/main/java/com/isms/domain/ProductService.java \
  backend/src/main/java/com/isms/domain/PurchaseOrderService.java \
  backend/src/main/java/com/isms/domain/SalesOrderService.java \
  backend/src/main/java/com/isms/domain/SalesPersonnelService.java \
  backend/src/main/java/com/isms/domain/StockRecordService.java \
  backend/src/main/java/com/isms/domain/SupplierService.java
git commit -F - <<'MSG'
fix(domain): business-rule fixes and audit logging across modules

- PO rejection and insufficient-stock now notify managers
- BR-3 stock floor guard (InsufficientStockException), BR-4 rating guard, channel casing
- Audit logger covers stock, PO and sales events (SE-5)
- Notification preferences, forecast-accuracy recording, supplier history

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 3 — Controllers, security, config, test (13 files)

```bash
git add \
  backend/src/main/java/com/isms/api/AdminController.java \
  backend/src/main/java/com/isms/api/AuthController.java \
  backend/src/main/java/com/isms/api/ForecastController.java \
  backend/src/main/java/com/isms/api/NotificationController.java \
  backend/src/main/java/com/isms/api/ProductController.java \
  backend/src/main/java/com/isms/api/PurchaseOrderController.java \
  backend/src/main/java/com/isms/api/StockController.java \
  backend/src/main/java/com/isms/api/SupplierController.java \
  backend/src/main/java/com/isms/api/UserController.java \
  backend/src/main/java/com/isms/api/VoiceController.java \
  backend/src/main/java/com/isms/security/SecurityConfig.java \
  backend/src/main/resources/application.yml \
  backend/src/test/java/com/isms/RbacMatrixTest.java
git commit -F - <<'MSG'
fix(api): validation, 401 vs 403, PO create 500, admin audit endpoint

- @Valid on request bodies: bad input now returns 400, not 500
- Unauthenticated/expired requests return 401 (UI session timeout relies on it); role denials stay 403
- open-in-view enabled so PO/supplier lazy fields serialize (PO list/create returned 500)
- Admin audit-log endpoint, notification preferences, forecast accuracy, supplier history endpoints
- RbacMatrixTest expects 401 for unauthenticated

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 4 — Demo data (3 files)

```bash
git add \
  backend/src/main/java/com/isms/config/DemoDataSeeder.java \
  backend/src/main/resources/application-demo.yml \
  Makefile
git commit -F - <<'MSG'
feat(demo): demo data seeder and make seed target

- Demo profile seeds 5 suppliers, 31 SKUs, 62 stock rows, POs and 443 sales over 52 weeks
- make seed no longer calls a non-existent endpoint

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 5 — Design system and shell (8 files)

```bash
git add \
  frontend/src/index.css \
  frontend/index.html \
  frontend/public/favicon.svg \
  frontend/src/components/ThemeToggle.tsx \
  frontend/src/components/Logo.tsx \
  frontend/src/components/Layout.tsx \
  frontend/src/App.tsx \
  frontend/src/pages/auth/LoginPage.tsx
git commit -F - <<'MSG'
feat(ui): teal brand with ISMS logo, light + black dark themes, sidebar layout, role-guarded routes

- New ISMS cube logo + favicon replace the purple "IS" tile; brand colour is now teal/emerald
- Dark mode is neutral black (persisted, follows OS by default, no flash) with themed status colours and charts
- Sidebar layout with mobile drawer, role-based nav
- RoleGuard route protection merged with the role-based UI work from origin/main
- Forgot-password link and theme toggle on login

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 6 — New pages (5 files)

```bash
git add \
  frontend/src/pages/dashboard/DashboardPage.tsx \
  frontend/src/pages/admin/AuditLogPage.tsx \
  frontend/src/pages/auth/PasswordResetPage.tsx \
  frontend/src/pages/notifications/NotificationPreferencesPage.tsx \
  frontend/src/components/OnboardingModal.tsx
git commit -F - <<'MSG'
feat(ui): dashboard, audit log, password reset, notification preferences, onboarding

- Live dashboard (stock KPIs, revenue by channel, low-stock list, role quick actions)
- Administrator audit-log viewer
- Password reset request/confirm page
- Per-type notification channel preferences
- Role-specific onboarding walkthrough (shown once, reopened from the help button)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 7 — Existing pages (7 files)

```bash
git add \
  frontend/src/pages/inventory/InventoryPage.tsx \
  frontend/src/pages/forecast/ForecastPage.tsx \
  frontend/src/pages/notifications/NotificationsPage.tsx \
  frontend/src/pages/purchaseOrders/PurchaseOrdersPage.tsx \
  frontend/src/pages/sales/SalesPage.tsx \
  frontend/src/pages/suppliers/SuppliersPage.tsx \
  frontend/src/pages/voice/VoiceCommandPage.tsx
git commit -F - <<'MSG'
fix(ui): align pages with the API contract and add supplier history, forecast accuracy, reserved stock

- Inventory: create product and stock adjustment sent wrong field names (500); Reserved column
- Sales: marketplace simulator used the wrong URL and payload
- Suppliers: performance-history modal; Forecast: accuracy tab and PO id fix; Notifications: preferences link
- Status colours use theme tokens so every page works in dark mode

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 8 — Scripts (3 files)

```bash
git add \
  scripts/smoke_test.sh \
  scripts/module_split.py \
  backend/src/test/java/com/isms/ClassDiagramStructureTest.java
git commit -F - <<'MSG'
test: live API smoke test and module split tooling

- ClassDiagramStructureTest: every attribute and relationship of the UML class diagram (12 checks)
- smoke_test.sh: 50 end-to-end API checks (CRUD, RBAC, PO lifecycle, sales, simulator, audit)
- module_split.py: builds the module-by-module repo and verifies every stage compiles

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 9 — Docs (4 files)

```bash
git add \
  README.md \
  github.md \
  github2.md \
  docs/class-diagram-mapping.md
git commit -F - <<'MSG'
docs: README, module hand-off guide and lala merge guide

- docs/class-diagram-mapping.md: class diagram (12 classes, 43 operations, 9 relationships) -> code, with documented deviations
- README matches real accounts, SKUs and ports
- github.md: module-by-module plan for the new repository
- github2.md: this guide

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

### Commit 10 — Course material (8 files)

```bash
git add \
  "moodle/2024300042_2024300057_SE_Exp5 (1) (3).pdf" \
  "moodle/ISMS_WBS_and_Project_Schedule_Stavan_Dev (1).pdf" \
  "moodle/SE_EXP3_2024300042_Stavan_Dev (2).pdf" \
  "moodle/SE_EXP6_Stavan_Dev (2).pdf" \
  "moodle/SE_Exp4.1 (2).pdf" \
  "moodle/SE_USECASEDIAGRAM_Stavan_Dev (1) (1).pdf" \
  "moodle/SRS_Inventory_Stock_Management_System_Dev_Stavan (2).pdf" \
  moodle/moodle.md
git commit -F - <<'MSG'
docs(course): add moodle reference PDFs

- moodle.md: consolidated SRS, use cases, class/sequence/activity/DFD notes and WBS (requirements source)
- Original course PDFs: SRS, use-case diagram, WBS/schedule and experiment write-ups

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
MSG
```

## 3. Bring in Stavan's commit (resolve the 3 conflicts by keeping yours)

```bash
git status --short                    # must print nothing: all 10 commits are made
git merge origin/main                 # CONFLICT in App.tsx, Layout.tsx, index.css is expected
git checkout --ours -- frontend/src/App.tsx frontend/src/components/Layout.tsx frontend/src/index.css
git add frontend/src/App.tsx frontend/src/components/Layout.tsx frontend/src/index.css
git commit -m "merge: integrate role-based UI from origin/main (keep unified App/Layout/theme)"
```

If `git merge` reports a conflict in any *other* file, stop and ask — there should be none (his commit touched only those three).

## 4. Verify before pushing

```bash
cd frontend && npm ci && npx tsc --noEmit && npm run build && npm test && cd ..
cd backend && ./mvnw test && cd ..          # needs JDK 21+ and Postgres isms/isms (see github.md section 5)
```

Expected: type-check clean, build succeeds, Vitest 1 passed, backend **56 tests, 0 failures**. For a live check start the backend with `SPRING_PROFILES_ACTIVE=demo` and run `bash scripts/smoke_test.sh` (50 passed).

## 5. Push

```bash
git push origin main
git status                              # 'Your branch is up to date with origin/main', working tree clean
git log --oneline -12
```

Tell Stavan to `git pull` — his App/Layout/CSS are now the merged versions.

## 6. Completeness check (nothing left out)

After step 3, `git status --short` must be empty and this must print 0:

```bash
git status --porcelain | wc -l
```

## 7. File → commit index (76 files)

| File | State | Commit |
|---|---|---|
| `Makefile` | modified | 4 |
| `README.md` | modified | 9 |
| `backend/src/main/java/com/isms/api/AdminController.java` | new | 3 |
| `backend/src/main/java/com/isms/api/AuthController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/ForecastController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/NotificationController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/ProductController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/PurchaseOrderController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/StockController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/SupplierController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/UserController.java` | modified | 3 |
| `backend/src/main/java/com/isms/api/VoiceController.java` | modified | 3 |
| `backend/src/main/java/com/isms/audit/AuditLogger.java` | modified | 2 |
| `backend/src/main/java/com/isms/config/DemoDataSeeder.java` | new | 4 |
| `backend/src/main/java/com/isms/domain/ForecastService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/NotificationService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/ProductService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/PurchaseOrderService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/SalesOrderService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/SalesPersonnelService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/StockRecordService.java` | modified | 2 |
| `backend/src/main/java/com/isms/domain/SupplierService.java` | modified | 2 |
| `backend/src/main/java/com/isms/error/InsufficientStockException.java` | new | 2 |
| `backend/src/main/java/com/isms/model/ForecastAccuracy.java` | new | 1 |
| `backend/src/main/java/com/isms/model/Notification.java` | modified | 1 |
| `backend/src/main/java/com/isms/model/NotificationPreference.java` | new | 1 |
| `backend/src/main/java/com/isms/model/SalesOrderLineItemId.java` | modified | 1 |
| `backend/src/main/java/com/isms/model/StockRecord.java` | modified | 1 |
| `backend/src/main/java/com/isms/model/enums/NotificationStatus.java` | modified | 1 |
| `backend/src/main/java/com/isms/repository/ForecastAccuracyRepository.java` | new | 1 |
| `backend/src/main/java/com/isms/repository/NotificationPreferenceRepository.java` | new | 1 |
| `backend/src/main/java/com/isms/repository/PoLineItemRepository.java` | modified | 1 |
| `backend/src/main/java/com/isms/repository/SalesOrderLineItemRepository.java` | modified | 1 |
| `backend/src/main/java/com/isms/repository/UserRepository.java` | modified | 1 |
| `backend/src/main/java/com/isms/security/SecurityConfig.java` | modified | 3 |
| `backend/src/main/resources/application-demo.yml` | new | 4 |
| `backend/src/main/resources/application.yml` | modified | 3 |
| `backend/src/main/resources/db/migration/V3__notification_read_status.sql` | new | 1 |
| `backend/src/main/resources/db/migration/V4__fix_sales_line_item_pk.sql` | new | 1 |
| `backend/src/main/resources/db/migration/V5__notification_preferences.sql` | new | 1 |
| `backend/src/main/resources/db/migration/V6__forecast_accuracy.sql` | new | 1 |
| `backend/src/test/java/com/isms/ClassDiagramStructureTest.java` | new | 8 |
| `backend/src/test/java/com/isms/RbacMatrixTest.java` | modified | 3 |
| `docs/class-diagram-mapping.md` | new | 9 |
| `frontend/index.html` | modified | 5 |
| `frontend/public/favicon.svg` | new | 5 |
| `frontend/src/App.tsx` | modified | 5 |
| `frontend/src/components/Layout.tsx` | modified | 5 |
| `frontend/src/components/Logo.tsx` | new | 5 |
| `frontend/src/components/OnboardingModal.tsx` | new | 6 |
| `frontend/src/components/ThemeToggle.tsx` | new | 5 |
| `frontend/src/index.css` | modified | 5 |
| `frontend/src/pages/admin/AuditLogPage.tsx` | new | 6 |
| `frontend/src/pages/auth/LoginPage.tsx` | modified | 5 |
| `frontend/src/pages/auth/PasswordResetPage.tsx` | new | 6 |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | new | 6 |
| `frontend/src/pages/forecast/ForecastPage.tsx` | modified | 7 |
| `frontend/src/pages/inventory/InventoryPage.tsx` | modified | 7 |
| `frontend/src/pages/notifications/NotificationPreferencesPage.tsx` | new | 6 |
| `frontend/src/pages/notifications/NotificationsPage.tsx` | modified | 7 |
| `frontend/src/pages/purchaseOrders/PurchaseOrdersPage.tsx` | modified | 7 |
| `frontend/src/pages/sales/SalesPage.tsx` | modified | 7 |
| `frontend/src/pages/suppliers/SuppliersPage.tsx` | modified | 7 |
| `frontend/src/pages/voice/VoiceCommandPage.tsx` | modified | 7 |
| `github.md` | new | 9 |
| `github2.md` | new | 9 |
| `moodle/2024300042_2024300057_SE_Exp5 (1) (3).pdf` | new | 10 |
| `moodle/ISMS_WBS_and_Project_Schedule_Stavan_Dev (1).pdf` | new | 10 |
| `moodle/SE_EXP3_2024300042_Stavan_Dev (2).pdf` | new | 10 |
| `moodle/SE_EXP6_Stavan_Dev (2).pdf` | new | 10 |
| `moodle/SE_Exp4.1 (2).pdf` | new | 10 |
| `moodle/SE_USECASEDIAGRAM_Stavan_Dev (1) (1).pdf` | new | 10 |
| `moodle/SRS_Inventory_Stock_Management_System_Dev_Stavan (2).pdf` | new | 10 |
| `moodle/moodle.md` | new | 10 |
| `scripts/module_split.py` | new | 8 |
| `scripts/smoke_test.sh` | new | 8 |

Not committed on purpose (git-ignored build output): `backend/target/`, `frontend/node_modules/`, `frontend/dist/`.

## 8. What changed, in one paragraph

The backend was functionally complete but several endpoints failed in the running app (Purchase Orders list/create, `GET /stock`, validation, 401 vs 403). Those are fixed and covered by a 50-check live smoke test. The frontend gained dark mode, a sidebar layout, a live dashboard, and the missing pages (audit log, password reset, notification preferences, onboarding, supplier history, forecast accuracy); existing pages were aligned to the real API contract. The module-by-module plan for the *new* repository is in `github.md`.
