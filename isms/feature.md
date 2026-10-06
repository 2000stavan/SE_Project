# feature.md — Features We Are Implementing

Legend — **Tier 1**: mandatory (core + foundation). **Tier 2**: implement after Tier 1 is green. **Tier 3**: stretch. "Seq" = sequence diagram; "DFD" = process number.

## F1. Authentication & RBAC — Tier 1 (SRS 4.1, DFD 1.0, class `User`)

| ID | SRS tag | Feature | Acceptance |
|---|---|---|---|
| F1.1 | Auth.Login | Login with user_id/email + password | Valid → JWT + role dashboard; invalid → generic error |
| F1.2 | Auth.Login.Fail | Lock after 5 failures in 15 min | 6th attempt rejected; `users.status='locked'`; admin can unlock |
| F1.3 | Auth.Password.Reset | Reset via verified e-mail token | Mail visible in Mailpit; token single-use, 30 min expiry |
| F1.4 | Auth.RBAC.Roles / Enforce | 4 roles, route-level + UI-level enforcement | Forbidden → 403 and hidden menu items |
| F1.5 | Auth.RBAC.Assign | Administrator changes a user's role (`assign_role()`) | Takes effect on next request |
| F1.6 | Auth.Session.Timeout | 30 min inactivity logout | Token sliding expiry; UI redirects to login |
| F1.7 | Auth.Audit.Log / SE-5 | Log login, logout, role change, stock/PO/sales transactions | JSON log lines with user, action, timestamp |

## C1. Inventory Management — Tier 1 (SRS 4.2, Seq 1, DFD 4.0 & 7.0)

| ID | SRS tag | Feature | Acceptance |
|---|---|---|---|
| C1.1 | Inventory.Search | `Product.search()` by SKU/name, category, location, qty range | Filters combine; returns product + stock rows |
| C1.2 | Inventory.CRUD.Create | `Product.create()` with name, category, unit, price, reorder point; creates initial `StockRecord` | 409 on duplicate SKU |
| C1.3 | Inventory.CRUD.Update | `Product.update()` and `StockRecord.update_stock()` | `last_updated` refreshed |
| C1.4 | Inventory.CRUD.Delete | `Product.delete()` guarded (D7) | 409 if stock > 0 or referenced |
| C1.5 | Sync.Channel.Realtime | `StockRecord.realtime_sync()` publishes change to WebSocket clients + outbound "channel" adapters (storefront, marketplace stubs) within 5 s | Two browser tabs update live; adapter log shows push |
| C1.6 | Sync.Channel.Conflict | Two simultaneous reservations of last unit | One succeeds, the other gets out-of-stock |
| C1.7 | Voice.Command.Capture/Interpret/Confirm | `WarehouseStaff.capture_voice_command()` → parse → read back → confirm by voice or tap → commit | Seq 1 loop reproduced; spoken confirmation text shown & spoken |
| C1.8 | Voice.Command.LowConfidence / CO-4 | Below threshold → "please repeat" or fall back to form | Threshold configurable |
| C1.9 | Robustness-1 | Offline voice command queue and replay | Idempotent by `client_id` |
| C1.10 | Notify.LowStock.Trigger (Seq 1 `alt`) | After any stock change, if `quantity_on_hand < reorder_point` → `Notification.trigger_low_stock()` + `send_audio_alert()` | Else "no alert required" branch |

## F2. Notifications — Tier 1 (SRS 4.7, DFD 7.0, class `Notification`)

| ID | SRS tag | Feature | Acceptance |
|---|---|---|---|
| F2.1 | Notify.Channel.EmailSMS | E-mail via SMTP (Mailpit) and SMS via stub gateway | `notifications` row per recipient+channel, status Sent/Failed |
| F2.2 | Notify.Channel.Audio / SA-2 | Audio alert spoken in browser with volume cap | Played on WS-connected warehouse screens |
| F2.3 | Notify.ShippingDelay.Trigger | `trigger_shipping_delay()` for overdue PO | Manager notified once per PO |
| F2.4 | Notify.Log | Every notification logged | In-app inbox lists history |
| F2.5 | Notify.Preferences.Configure | **Tier 3 / deferred** (schema change) | — |

## C2. Manage Purchase Order — Tier 1 (SRS 4.3 & 4.4, Seq 2, DFD 6.0)

| ID | SRS tag | Feature | Acceptance |
|---|---|---|---|
| C2.1 | Supplier.Create/Edit | `Supplier.create()`, `edit()` | Validation of contact fields |
| C2.2 | Supplier.Search | `Supplier.search()` ranked by rating | Seq 2 first message |
| C2.3 | PO.Create | `PurchaseOrder.create()` (supplier, SKUs, qty, expected date), status Draft | Seq 2 `create()` |
| C2.4 | PO.Status.Track | Six-state lifecycle with legal transitions only | Illegal transition → 409 |
| C2.5 | PO.Approve + BR-2 | `Manager.approve_po()` → `PurchaseOrder.approve()` with approval limit and credit limit | Over-limit manager blocked; admin allowed |
| C2.6 | PO.Approve.Reject | `reject_po()` / `reject()` with reason → back to Draft | Reason delivered as notification |
| C2.7 | PO.Receive.Confirm / Partial | `WarehouseStaff.receive_po_confirm()` → `PurchaseOrder.receive_confirm()` per line | Partial → Partially Received, outstanding remains |
| C2.8 | PO.Receive.StockUpdate | `StockRecord.update_stock()` increases stock, triggers sync | Stock visible in C1 views |
| C2.9 | Supplier.Performance.Track + BR-4 | `Supplier.track_performance()` after Received/Cancelled only | Rating & on-time rate change |
| C2.10 | PO.Overdue.Flag | `PurchaseOrder.flag_overdue()` hourly job + Seq 2 `opt` | Overdue badge + F2.3 notification |
| C2.11 | Supplier.Performance.View | Past POs, timeliness, quality flags | Supplier detail page |
| C2.12 | Supplier.Deactivate + BR-5 | `Administrator.deactivate_supplier()` | Blocked with open POs |

## C3. Process Sales — Tier 1 (SRS 4.5, Seq 3, DFD 3.0)

| ID | SRS tag | Feature | Acceptance |
|---|---|---|---|
| C3.1 | Sales.Physical.Log | `SalesPersonnel.log_physical_sale()`: scan/select SKUs & qty | Seq 3 first message; barcode-wedge input supported |
| C3.2 | Sales.Order.Create | `SalesOrder.create_order()` | Order with channel, lines, status |
| C3.3 | DFD 3.3 stock check + Sales.Stock.Insufficient | Insufficient stock → line rejected, status `Rejected`, Manager notified | Seq 3 "cannot be processed" branch |
| C3.4 | Sales.Stock.Deduct + BR-3 | `StockRecord.deduct_stock()` never below zero | Concurrency test |
| C3.5 | DFD 3.4 payment | Mock Payment Gateway returns `payment_reference` | Stored in `sales_orders.payment_reference` |
| C3.6 | Invoice.Generate | `SalesOrder.generate_invoice()` PDF (items, qty, price, tax, total) | Download from order page |
| C3.7 | Sales.Webhook.Receive/Validate | `SalesOrder.process_webhook()`; HMAC check; created/paid/cancelled/returned; idempotent | Bad signature → 401; replay safe; < 10 s |
| C3.8 | Sales.Return.Process | `SalesOrder.process_return()` reverses stock | Seq 3 `opt` branch |
| C3.9 | Sales.Order.View | Filter by channel, date range, status | Sales & Manager roles |

## E1. Forecasting & Analytics — Tier 2 (SRS 4.6, DFD 5.0, class `Forecast`)

| ID | SRS tag | Feature | Acceptance |
|---|---|---|---|
| E1.1 | Forecast.Demand.Generate | `Forecast.generate_demand()` per SKU/location, scheduled + manual | Rows in `forecasts` |
| E1.2 | Forecast.Seasonality.Detect | `Forecast.detect_seasonality()` | Detected period shown in UI |
| E1.3 | Forecast.Reorder.Recommend | `Forecast.recommend_reorder()` using lead time | Recommended qty per SKU |
| E1.4 | Forecast.Reorder.Suggest | Pre-filled PO draft from suggestion | One-click create PO (C2.3) |
| E1.5 | Analytics.Dashboard.Revenue | Revenue by channel/location/period charts | Matches seeded data |
| E1.6 | Analytics.Dashboard.Stock | Low-stock / overstock views | |
| E1.7 | Forecast.Accuracy.Track | Forecast vs actual comparison | Tier 3 (needs actuals join; no schema change) |

## E2. Administration — Tier 2 (DFD 2.0, class `Administrator`)

| ID | Feature |
|---|---|
| E2.1 | User list/create/deactivate (BR-5), unlock locked users |
| E2.2 | Role assignment UI (F1.5) |
| E2.3 | Supplier deactivation UI (C2.12) |
| E2.4 | System settings screen **read-only** (shows approval limit, thresholds from env) — editable settings need a table, Tier 3 |

## E3. Quality & Demo Features — Tier 2/3

| ID | Feature |
|---|---|
| E3.1 | Marketplace simulator endpoint + CLI script (signs payloads) |
| E3.2 | Contextual help link + first-time onboarding walkthrough per role (UD-1, UD-2) |
| E3.3 | Inline form validation (UI-4), voice-state indicator listening/processing/confirmed (UI-3) |
| E3.4 | Load test script for NFR PE-1/PE-3 |
| E3.5 | Auto-generated `docs/traceability.md` (SRS tag → file → test) |

## Sequence-diagram → feature coverage

| Sequence | Messages (in order) | Covered by |
|---|---|---|
| 1 Inventory | search → create → update_stock → update → update_stock → delete → loop capture_voice_command → update_stock → realtime_sync → alt (trigger_low_stock, send_audio_alert / no alert) | C1.1–C1.10, F2 |
| 2 Purchase Order | Supplier.search → Product.search → PO.create → alt [approve_po → approve → receive_po_confirm → receive_confirm → track_performance] / [reject_po → reject] → opt flag_overdue | C2.1–C2.12 |
| 3 Sales | log_physical_sale → Product.search → create_order → alt [process_webhook, generate_invoice] / [not processed] → opt process_return | C3.1–C3.9 |

## Role → feature access matrix

| Capability | A | M | W | S |
|---|---|---|---|---|
| Users/roles, supplier deactivate | ✔ | | | |
| Products create/update | ✔ | ✔ | ✔ | |
| Product delete | ✔ | ✔ | | |
| Stock update (UI/voice) | ✔ | ✔ | ✔ | |
| Stock view/search | ✔ | ✔ | ✔ | ✔ |
| Supplier create/edit/search | ✔ | ✔ | | |
| PO create/submit | | ✔ | | |
| PO approve/reject/cancel | ✔ | ✔ (limit) | | |
| PO receive | | | ✔ | |
| Log physical sale, view orders, returns | ✔ | ✔ | | ✔ |
| Forecast & dashboards | ✔ | ✔ | stock only | |
