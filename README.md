# Inventory and Stock Management System (ISMS)

The **Inventory and Stock Management System (ISMS)** is an enterprise-grade full-stack supply chain and inventory application engineered for multi-channel commerce, real-time warehouse operations, voice-directed stock management, purchase order approval workflows, and algorithmic demand forecasting.

---

## 1. System Architecture & Tech Stack

- **Backend:** Java 21, Spring Boot 3.3.5, Spring Data JPA, Spring Security, Flyway, PostgreSQL 16.
- **Frontend:** React 18, Vite, TypeScript, TailwindCSS, React Query, Web Audio API / SpeechSynthesis.
- **Security:** Stateless JWT authentication, 30-minute sliding session timeouts, 5-attempt/15-minute account lockout, HMAC-SHA256 marketplace webhook verification (`X-Signature`), and BCrypt password encryption.
- **Concurrency & Integrity:** Database row-level pessimistic locking (`PESSIMISTIC_WRITE`) preventing negative stock balances, idempotent event processing, and atomic status transitions.
- **Reporting & Analytics:** In-process Holt-Winters additive demand forecasting with seasonal-naive fallback, OpenPDF invoice generation, and real-time WebSocket synchronization (`/ws/stock`, `/ws/alerts`).

---

## 2. Quick Start

### Prerequisites
- Docker & Docker Compose
- Java 21 (JDK 21)
- Node.js 18+ and npm

### Running the Entire System
```bash
# Start PostgreSQL, Mailpit, Backend, and Frontend containers
make up

# View running services:
# Frontend Web App:  http://localhost:3000
# Backend REST API:  http://localhost:8080
# Mailpit Web UI:    http://localhost:8025
```

### Running Test Suites
```bash
# Execute complete backend (JUnit 5 + Testcontainers) and frontend (Vitest) suites
make test
```

### Stopping the System
```bash
make down
```

---

## 3. Seed Users & Demo Credentials

| Role | User ID | Email | Password | Primary Permissions |
|---|---|---|---|---|
| **Administrator** | `USR-ADMIN-1` | `admin@isms.com` | `Password123!` | User provisioning, RBAC role assignment, account unlocking, settings, unlimited PO approvals |
| **Manager** | `USR-MGR-1` | `manager1@isms.com` | `Password123!` | PO approvals up to $50,000, demand forecasting, 1-click PO drafts, revenue & stock analytics |
| **Warehouse Staff** | `USR-WH-1` | `warehouse1@isms.com` | `Password123!` | Voice-driven inventory adjustments, PO goods receipt confirmation, low-stock alerts |
| **Sales Personnel** | `USR-SALES-1` | `sales1@isms.com` | `Password123!` | Barcode POS terminal, customer returns, invoice generation & downloads |

---

## 4. End-to-End Acceptance Walkthrough Demo Script

Follow this step-by-step walkthrough to verify all core workflows:

### Step 1: Voice-Driven Stock Adjustment & Real-Time Sync (Warehouse Staff)
1. Navigate to `http://localhost:3000` and login as **Warehouse Staff** (`warehouse1@isms.com` / `staff123`).
2. Go to **Voice Command** (`/voice`).
3. Click **Start Recording** (or type in the fallback box): `"add 20 units of SKU-1001 to location WH-01"`.
4. Observe the parsed action, SKU, quantity, and spoken confirmation prompt.
5. Click **Confirm & Execute**. The inventory updates instantly.
6. Open a second tab at `http://localhost:3000/inventory` to observe live updates via WebSocket without refreshing.
7. Reduce a product's stock below its reorder point to trigger a real-time low stock audio alert chime and email notification (visible in Mailpit at `http://localhost:8025`).

### Step 2: Supplier Procurement & Purchase Order Lifecycle (Manager)
1. Logout and login as **Manager** (`manager1@isms.com` / `manager123`).
2. Go to **Suppliers** (`/suppliers`) to review vendor ratings clamped to $[0.00, 5.00]$.
3. Go to **Purchase Orders** (`/purchase-orders`) and click **Create Purchase Order Draft**.
4. Select a supplier and add items under the $50,000 manager approval threshold. Submit the PO for approval.
5. In the same view, click **Approve** to transition the PO to `Approved`. (To demonstrate rejection, submit another PO and click **Reject** with a reason to revert it back to `Draft`).
6. Logout and login as **Warehouse Staff** to receive items: Click **Confirm Goods Receipt** to increment warehouse inventory and recalculate supplier rating.

### Step 3: Point-of-Sale Terminal & Marketplace Orders (Sales Personnel)
1. Logout and login as **Sales Personnel** (`sales1@isms.com` / `sales123`).
2. Go to **Sales & POS** (`/sales`).
3. In the **POS Terminal**, scan or enter a SKU (`SKU-1001`), add items to the cart, select payment method (`Credit Card`), and click **Complete Physical Sale**.
4. Stock is immediately locked and deducted; click **Download Invoice PDF** to inspect the generated PDF invoice.
5. Open the **Marketplace Simulator** tab (or run `./scripts/simulate_marketplace.sh amazon order-created`) to fire an HMAC-SHA256 signed inbound order. The order is ingested idempotently and stock decrements.
6. Go to **Order History** tab, click **Process Return** on an existing order, specify restock quantity, and confirm. Stock is restored to inventory.

### Step 4: Algorithmic Forecasting & 1-Click PO Drafts (Manager)
1. Logout and login as **Manager** (`manager1@isms.com` / `manager123`).
2. Navigate to **Forecast & Analytics** (`/forecast`).
3. Click **Run Forecast Job** to execute in-process Holt-Winters demand forecasting across inventory SKUs.
4. Go to **Reorder Suggestions** to review items near reorder thresholds.
5. Click **Create Draft PO** on any recommendation to generate a pre-filled Purchase Order with 1 click.
6. Switch to **Revenue Analytics** and **Stock & Inventory Views** to inspect real-time channel revenue shares and catalog valuations.

### Step 5: Administration, Account Unlocking & Global Settings (Administrator)
1. Logout and login as **Administrator** (`admin@isms.com` / `admin123`).
2. Go to **User Admin** (`/users`).
3. Click **Add New User** with inline validation (UI-4).
4. Click **Assign Role** to modify a user's RBAC privileges.
5. To test lockout unlocking: Attempt 5 incorrect logins on a test user until locked; then as Admin click **Unlock & Activate** to reset the failed counter immediately.
6. Switch to **System Settings (Read-Only)** to review global runtime environment parameters (E2.4).
7. Click **Role Onboarding Guide** for the role walkthrough documentation (UD-1, UD-2).

---

## 5. Performance & NFR Validation

Run the automated NFR load testing benchmark:
```bash
./scripts/load_test.sh
```
This tests concurrent API request handling and validates that 95th percentile latency remains under the 2.0s requirement (PE-1 / PE-3).
