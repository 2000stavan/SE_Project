# api-spec.md — REST API contract

Base path `/api/v1`, JSON over HTTPS (SRS CO-3). Auth: `Authorization: Bearer <JWT>` (30-min idle timeout, SRS `Auth.Session.Timeout`). Errors: `{ "error": { "code": "...", "message": "..." } }`. Role codes: **A** Administrator, **M** Manager, **W** Warehouse Staff, **S** Sales Personnel.

Method names in the "Calls" column are the **class-diagram method names**. In the Java service layer they exist with the same names converted mechanically from snake_case to camelCase (`update_stock()` → `updateStock()`, `receive_po_confirm()` → `receivePoConfirm()`) on the service class for the owning class (`StockRecord` → `StockRecordService`, etc.). Spring Boot controllers live in `com.isms.api`, and `/ws/stock` / `/ws/alerts` are Spring WebSocket handlers.

## Auth (DFD 1.0) — class `User`
| Endpoint | Roles | Calls | SRS |
|---|---|---|---|
| POST `/auth/login` {user_id\|email, password} | public | `User.login()` | Auth.Login, Auth.Login.Fail |
| POST `/auth/logout` | all | `User.logout()` | Auth.Audit.Log |
| POST `/auth/password-reset/request` {email} | public | `User.reset_password()` | Auth.Password.Reset |
| POST `/auth/password-reset/confirm` {token,new_password} | public | `User.reset_password()` | |
| GET `/auth/me` | all | — | |

## Users & Settings (DFD 2.0) — class `Administrator`
| Endpoint | Roles | Calls |
|---|---|---|
| GET `/users`, POST `/users` | A | — |
| PATCH `/users/{id}/role` {role} | A | `Administrator.assign_role()` |
| PATCH `/users/{id}/status` {active\|inactive} | A | — (BR-5) |

## Inventory — classes `Product`, `StockRecord` (Sequence 1, DFD 4.0)
| Endpoint | Roles | Calls | SRS |
|---|---|---|---|
| GET `/products?q=&category=&location=&min_qty=&max_qty=` | all | `Product.search()` | Inventory.Search |
| POST `/products` | A,M,W | `Product.create()` (+ initial `StockRecord` per location) | Inventory.CRUD.Create |
| GET `/products/{sku}` | all | — | |
| PATCH `/products/{sku}` | A,M,W | `Product.update()` | Inventory.CRUD.Update |
| DELETE `/products/{sku}` | A,M | `Product.delete()` — only when qty on hand is 0 everywhere and no PO/sales references; else 409 | Inventory.CRUD.Delete |
| GET `/stock?sku=&location=&min=&max=` | all | — | |
| PUT `/stock/{sku}/{location}` {quantity_on_hand} (or POST `/stock/adjust` {sku,location,delta,reason}) | A,M,W | `StockRecord.update_stock()` → `realtime_sync()` → low-stock check | Sync.Channel.Realtime |
| GET `/ws/stock` (WebSocket / SSE) | all | pushes stock-change events | PE-2 |

### Voice (Sequence 1 loop, DFD 4.1–4.5) — `WarehouseStaff.capture_voice_command()`
| Endpoint | Roles | Behaviour |
|---|---|---|
| POST `/voice/command` {transcript, confidence, device_id} | W,A,M | `WarehouseStaff.capture_voice_command()` → Interpret. If `confidence < VOICE_CONFIDENCE_THRESHOLD` → `{status:"low_confidence", action:"repeat_or_use_ui"}` (Voice.Command.LowConfidence). Else returns `{status:"needs_confirmation", token, interpreted:{action,sku,quantity,location}, spoken_text}` |
| POST `/voice/confirm` {token, confirmed:true\|false} | W,A,M | If confirmed → `StockRecord.update_stock()`; returns `{status:"committed", spoken_text}` |
| POST `/voice/command/queued` [ {client_id, transcript, ts} ] | W | Offline queue replay, idempotent on `client_id` (Robustness-1) |

STT/TTS run in the browser (Web Speech API) behind the `SpeechProvider` abstraction; the server only receives text. Interpreter grammar: `add|remove|set|check <n> [units of] <sku|name> [to|from|in] [bin|location] <loc>`.

## Suppliers (DFD 2.0 / 6.0) — class `Supplier`
| Endpoint | Roles | Calls | SRS |
|---|---|---|---|
| POST `/suppliers` | A,M | `Supplier.create()` | Supplier.Create |
| PATCH `/suppliers/{id}` | A,M | `Supplier.edit()` | Supplier.Edit |
| GET `/suppliers?q=&category=&min_rating=` (ranked by rating) | A,M | `Supplier.search()` | Supplier.Search |
| GET `/suppliers/{id}/performance` | A,M | `Supplier.track_performance()` read | Supplier.Performance.View |
| POST `/suppliers/{id}/deactivate` | A | `Administrator.deactivate_supplier()` — 409 if open POs | Supplier.Deactivate, BR-5 |

## Purchase Orders (Sequence 2, DFD 6.0) — class `PurchaseOrder`
| Endpoint | Roles | Calls | Status change |
|---|---|---|---|
| POST `/purchase-orders` {supplier_id, lines[], expected_date} | M | `PurchaseOrder.create()` | → Draft |
| POST `/purchase-orders/{id}/submit` | M | — | Draft → Pending Approval |
| POST `/purchase-orders/{id}/approve` | M (≤ limit), A | `Manager.approve_po()` → `PurchaseOrder.approve()`; BR-2 credit check | Pending Approval → Approved (+ "sent to supplier" notification) |
| POST `/purchase-orders/{id}/reject` {reason} | M, A | `Manager.reject_po()` → `PurchaseOrder.reject()`; reason → Order Update notification | Pending Approval → Draft |
| POST `/purchase-orders/{id}/cancel` | M, A | — | Draft/Pending/Approved → Cancelled |
| POST `/purchase-orders/{id}/receive` {lines:[{sku,qty,location}]} | W | `WarehouseStaff.receive_po_confirm()` → `PurchaseOrder.receive_confirm()` → `StockRecord.update_stock()` → `Supplier.track_performance()` | Approved/Partially Received → Partially Received / Received |
| GET `/purchase-orders?status=&supplier=` ; GET `/purchase-orders/{id}` | A,M,W | — | |
| GET `/purchase-orders/overdue` ; scheduler hourly | A,M | `PurchaseOrder.flag_overdue()` → `Notification.trigger_shipping_delay()` | PO.Overdue.Flag |

## Sales (Sequence 3, DFD 3.0) — classes `SalesOrder`, `SalesPersonnel`
| Endpoint | Roles | Calls | SRS |
|---|---|---|---|
| POST `/sales/physical` {lines:[{sku,qty}], location, customer_info?} | S,M,A | `SalesPersonnel.log_physical_sale()` → `Product.search()` → `SalesOrder.create_order()` → payment (mock) → `StockRecord.deduct_stock()` → `SalesOrder.generate_invoice()` | Sales.Physical.Log |
| POST `/sales/webhook/{marketplace}` (header `X-Signature` HMAC-SHA256, event in body: order-created/paid/cancelled/returned) | public + signature | `SalesOrder.process_webhook()` (validate → create/update order → reserve → deduct on paid) | Sales.Webhook.* |
| POST `/sales/{id}/return` ; POST `/sales/{id}/cancel` | S,M,A | `SalesOrder.process_return()` (reverses stock) | Sales.Return.Process |
| GET `/sales?channel=&from=&to=&status=` ; GET `/sales/{id}` | S,M,A | — | Sales.Order.View |
| GET `/sales/{id}/invoice` (PDF) | S,M,A | `SalesOrder.generate_invoice()` | Invoice.Generate |
| POST `/payments/mock/charge` | internal | Payment Gateway stub | |

Insufficient stock → order line rejected, order status `Rejected`, `Notification` to responsible Manager (Sales.Stock.Insufficient). Stock never negative (BR-3).

## Forecast & Analytics (DFD 5.0) — class `Forecast`
| Endpoint | Roles | Calls |
|---|---|---|
| POST `/forecast/run` (also scheduled) | A,M | `Forecast.generate_demand()` → `detect_seasonality()` → `recommend_reorder()` |
| GET `/forecast?sku=&location=` | A,M | read |
| GET `/forecast/reorder-suggestions` | M | SKUs near reorder point with pre-filled PO payload (Forecast.Reorder.Suggest) |
| GET `/analytics/revenue?group_by=channel\|location\|period&from=&to=` | A,M | Analytics.Dashboard.Revenue |
| GET `/analytics/stock` | A,M,W | low-stock / overstock lists |

## Notifications (DFD 7.0) — class `Notification`
| Endpoint | Roles | Calls |
|---|---|---|
| GET `/notifications` (own) ; PATCH `/notifications/{id}/read` | all | — |
| (internal) | — | `Notification.trigger_low_stock()`, `trigger_shipping_delay()`, `send_audio_alert()` (Audio channel is delivered to the browser through the WS channel and spoken with `speechSynthesis`, at the configured volume cap, SA-2) |

## Dev-only
| Endpoint | Purpose |
|---|---|
| POST `/dev/simulate-marketplace-order` | Signs and posts a fake marketplace order to the webhook (for demos/tests) |
| GET `/health` | liveness |
