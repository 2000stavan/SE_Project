# github2.md - Commit the follow-up changes to the existing `lala` repo

> Repo: https://github.com/2000stavan/lala (branch `main`). You commit and push these changes yourself.

## 0. Where things stand

The first round (the ten commits and the merge of Stavan's `01953dc`) is **already on `main`** (`2223456 merge: integrate role-based UI ...`). Nothing from that round needs to be redone.

This round contains the bugs found while preparing the Experiment 8 report (found by running the real system, not by the old tests) and the report itself. **24 files** are changed; every one of them is listed below, in 7 commits.

## 1. Before you start

```bash
cd se-proj
git fetch origin
git status -sb                      # '## main...origin/main' and the 24 modified files listed in section 4
git log --oneline HEAD..origin/main  # must print nothing; if it prints commits, run 'git pull --rebase' first
```

Line-ending warnings (`LF will be replaced by CRLF`) are harmless.

## 2. The commits

Run them in order (Git Bash; in PowerShell use one `-m` per line instead of the here-document).

### Commit 1 - Module 1 - lockout (2 files)

```bash
git add \
  backend/src/main/java/com/isms/domain/UserService.java \
  backend/src/test/java/com/isms/AuthIntegrationTest.java
git commit -F - <<'MSG'
fix(auth): persist the account lock so the Administrator can see and unlock it

- The 5th failed login set status=locked and then threw ACCOUNT_LOCKED, which rolled the change back, so the lock lived only in memory
- login() is now @Transactional(noRollbackFor = ApiException.class)
- AuthIntegrationTest.testLockIsPersistedAndAdminCanUnlock (fails without the fix)

MSG
```

### Commit 2 - Module 2 - stock integrity (2 files)

```bash
git add \
  backend/src/main/java/com/isms/domain/StockRecordService.java \
  backend/src/test/java/com/isms/SalesConcurrencyTest.java
git commit -F - <<'MSG'
fix(inventory): never oversell the last unit under concurrent sales

- After taking the row lock Hibernate returned the stale cached row, so concurrent sales both passed the BR-3 check
- deductStock now refreshes the row after locking it
- SalesConcurrencyTest: 6 simultaneous sales of one unit -> exactly 1 order (was 6)

MSG
```

### Commit 3 - Module 5 - sales (5 files)

```bash
git add \
  backend/src/main/java/com/isms/domain/SalesOrderService.java \
  backend/src/main/java/com/isms/domain/SaleRecordedEvent.java \
  backend/src/main/java/com/isms/domain/ForecastService.java \
  backend/src/main/java/com/isms/api/SalesController.java \
  backend/src/test/java/com/isms/Seq3SalesTest.java
git commit -F - <<'MSG'
fix(sales): keep REJECTED orders, notify the manager, list totals; decouple sales from forecast

- An order rejected for insufficient stock lost its REJECTED record and the manager notification (rolled back); now saved in a REQUIRES_NEW transaction
- GET /sales includes totalAmount and lineCount
- SalesOrderService publishes SaleRecordedEvent and ForecastService listens, so Sales no longer depends on Forecast at compile time
- Seq3SalesTest asserts the REJECTED order and the manager notification

MSG
```

### Commit 4 - Module 7 - notifications (2 files)

```bash
git add \
  backend/src/main/java/com/isms/model/Notification.java \
  frontend/src/pages/notifications/NotificationsPage.tsx
git commit -F - <<'MSG'
fix(notifications): inbox returned 500 and the page ignored read/unread and timestamp

- Notification.user (lazy proxy) is no longer serialised; GET /notifications works once alerts exist
- Page uses status (Pending/Sent/Read), timestamp and channel from the API

MSG
```

### Commit 5 - Frontend pages (5 files)

```bash
git add \
  frontend/src/pages/admin/UsersPage.tsx \
  frontend/src/pages/inventory/InventoryPage.tsx \
  frontend/src/pages/sales/SalesPage.tsx \
  frontend/src/pages/voice/VoiceCommandPage.tsx \
  frontend/src/pages/auth/LoginPage.tsx
git commit -F - <<'MSG'
fix(ui): User Admin on the design system, inventory edit/delete, sales and voice contract fixes

- UsersPage rebuilt on the design system; statuses handled in lowercase (all users were shown inactive)
- Inventory: Edit and guarded Delete (409 shown)
- Sales: order history, checkout confirmation, returns and simulator use the real API shapes
- Voice examples use seeded SKUs; login icon contrast in dark mode

MSG
```

### Commit 6 - Scripts (2 files)

```bash
git add \
  scripts/smoke_test.sh \
  scripts/module_split.py
git commit -F - <<'MSG'
test: smoke test self-contained (53 checks) and module split for the 8 SRS modules

- smoke_test.sh creates its own supplier, checks stock list, notifications with data, settings, performance
- module_split.py: eight modules following SRS 4.1-4.7 plus platform; verifies every stage compiles

MSG
```

### Commit 7 - Documentation (6 files)

```bash
git add \
  README.md \
  docs/traceability.md \
  github.md \
  github2.md \
  docs/Dev_Gaglani_2024300057_SE_Exp8.docx \
  docs/Dev_Gaglani_2024300057_SE_Exp8.pdf
git commit -F - <<'MSG'
docs: Experiment 8 report, traceability matrix and hand-off guides

- Dev_Gaglani_2024300057_SE_Exp8 (docx + pdf): modules, flow, traceability, screenshots and test cases
- traceability.md rewritten against the real DFD numbering (1.0-7.0, D1-D8), class operations and tests
- github.md: eight SRS-based modules (Dev 1,3,5,7 / Stavan 2,4,6,8); github2.md: this guide

MSG
```

## 3. Verify, then push

```bash
git status --porcelain | wc -l      # must print 0
cd frontend && npm ci && npx tsc --noEmit && npm run build && npm test && cd ..
cd backend && ./mvnw test && cd ..   # JDK 21+, Postgres isms/isms (see github.md section 5); expect 70 tests, 0 failures
git push origin main
git status -sb                       # '## main...origin/main', clean
```

For a live check start the backend with `SPRING_PROFILES_ACTIVE=demo` and run `bash scripts/smoke_test.sh` (expect **53 passed, 0 failed**).

## 4. File -> commit index (24 files)

| File | Commit |
|---|---|
| `README.md` | 7 |
| `backend/src/main/java/com/isms/api/SalesController.java` | 3 |
| `backend/src/main/java/com/isms/domain/ForecastService.java` | 3 |
| `backend/src/main/java/com/isms/domain/SaleRecordedEvent.java` | 3 |
| `backend/src/main/java/com/isms/domain/SalesOrderService.java` | 3 |
| `backend/src/main/java/com/isms/domain/StockRecordService.java` | 2 |
| `backend/src/main/java/com/isms/domain/UserService.java` | 1 |
| `backend/src/main/java/com/isms/model/Notification.java` | 4 |
| `backend/src/test/java/com/isms/AuthIntegrationTest.java` | 1 |
| `backend/src/test/java/com/isms/SalesConcurrencyTest.java` | 2 |
| `backend/src/test/java/com/isms/Seq3SalesTest.java` | 3 |
| `docs/Dev_Gaglani_2024300057_SE_Exp8.docx` | 7 |
| `docs/Dev_Gaglani_2024300057_SE_Exp8.pdf` | 7 |
| `docs/traceability.md` | 7 |
| `frontend/src/pages/admin/UsersPage.tsx` | 5 |
| `frontend/src/pages/auth/LoginPage.tsx` | 5 |
| `frontend/src/pages/inventory/InventoryPage.tsx` | 5 |
| `frontend/src/pages/notifications/NotificationsPage.tsx` | 4 |
| `frontend/src/pages/sales/SalesPage.tsx` | 5 |
| `frontend/src/pages/voice/VoiceCommandPage.tsx` | 5 |
| `github.md` | 7 |
| `github2.md` | 7 |
| `scripts/module_split.py` | 6 |
| `scripts/smoke_test.sh` | 6 |

Not committed on purpose (git-ignored build output): `backend/target/`, `frontend/node_modules/`, `frontend/dist/`, generated invoice PDFs.
