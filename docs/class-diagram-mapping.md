# Class diagram → implementation mapping

Source: the UML class diagram (`docs/source/Class Diagram by Mermaid.jpg`; transcribed in `moodle/moodle.md` §C, Experiment 3). It has **12 classes**, **43 operations** and **9 relationships**. Every one of them is implemented and checked by tests:

- `ClassContractTest` — every operation exists as a public method on the matching service (12 checks).
- `ClassDiagramStructureTest` — every attribute exists on the matching entity, every relationship is a JPA association of the right kind, and `User` has exactly four specialisations (12 checks).
- `SchemaMatchesSpecTest` — the database tables/columns match `schema.md`.
- `Seq1InventoryTest`, `Seq2PurchaseOrderTest`, `Seq3SalesTest` — the sequence diagrams: the *order* of the calls (`CallTraceAspect`) is asserted.

Naming: diagram `snake_case` becomes Java `camelCase`; JSON uses camelCase (a few request bodies use snake_case, see `api-spec.md`).

## 1. Classes → code

| Diagram class | Attributes → entity (`com.isms.model`) | Operations → service (`com.isms.domain`) | REST (`/api/v1`) | UI page |
|---|---|---|---|---|
| **User** | `User`: userId, name, email, role, hashedPassword, status | `UserService`: `login`, `logout`, `resetPassword` | `POST /auth/login`, `/auth/logout`, `/auth/password-reset/request`, `/auth/password-reset/confirm`, `GET /auth/me` | Login, Password reset |
| **Administrator** (extends User) | role = `ADMINISTRATOR` | `AdministratorService`: `assignRole`, `deactivateSupplier` | `PATCH /users/{id}/role`, `PATCH /users/{id}/status`, `POST /suppliers/{id}/deactivate`, `GET /admin/audit-log` | User Admin, Audit Log |
| **Manager** (extends User) | role = `MANAGER` | `ManagerService`: `approvePo`, `rejectPo` | `POST /purchase-orders/{id}/approve`, `/reject` | Purchase Orders |
| **WarehouseStaff** (extends User) | role = `WAREHOUSE_STAFF` | `WarehouseStaffService`: `receivePoConfirm`, `captureVoiceCommand` | `POST /purchase-orders/{id}/receive`, `POST /voice/command`, `/voice/confirm` | Purchase Orders, Voice |
| **SalesPersonnel** (extends User) | role = `SALES_PERSONNEL` | `SalesPersonnelService`: `logPhysicalSale` | `POST /sales/physical` | Sales & POS |
| **Product** | `Product`: skuId, name, category, unitPrice, reorderPoint, unitOfMeasure | `ProductService`: `create`, `update`, `delete`, `search` | `POST/GET/PATCH/DELETE /products` | Inventory |
| **StockRecord** | `StockRecord` (+ `StockRecordId`): skuId, locationId, quantityOnHand, quantityReserved, lastUpdated | `StockRecordService`: `updateStock`, `deductStock`, `realtimeSync` | `GET /stock`, `PUT /stock/{sku}/{location}`, `POST /stock/adjust`, WebSocket `/ws/stock` | Inventory (live) |
| **Forecast** | `Forecast` (+ `ForecastId`): skuId, locationId, forecastPeriod, predictedDemand, recommendedReorderQty | `ForecastService`: `generateDemand`, `detectSeasonality`, `recommendReorder` | `GET/POST /forecast`, `/forecast/reorder-suggestions`, `/forecast/accuracy`, `/analytics/*` | Forecast |
| **Supplier** | `Supplier`: supplierId, name, contactDetails, rating, leadTime, procurementHistory | `SupplierService`: `create`, `edit`, `trackPerformance`, `search` | `POST/PATCH/GET /suppliers`, `/suppliers/{id}/history`, `/performance` | Suppliers |
| **PurchaseOrder** | `PurchaseOrder`: poId, supplier, lineItems, status, orderDate, expectedDate | `PurchaseOrderService`: `create`, `approve`, `reject`, `receiveConfirm`, `flagOverdue` (hourly job) | `/purchase-orders` (+ `/submit`, `/cancel`, `/overdue`) | Purchase Orders |
| **SalesOrder** | `SalesOrder`: orderId, channel, customerInfo, lineItems, status, paymentReference | `SalesOrderService`: `createOrder`, `processWebhook`, `processReturn`, `generateInvoice` | `/sales`, `/sales/webhook/{marketplace}`, `/sales/{id}/return`, `/sales/{id}/invoice` | Sales & POS |
| **Notification** | `Notification`: notificationId, type, channel, user, message, timestamp, status | `NotificationService`: `triggerLowStock`, `triggerShippingDelay`, `sendAudioAlert` | `GET /notifications`, `PATCH /notifications/{id}/read`, `/notifications/preferences`, WebSocket `/ws/alerts` | Notifications |

## 2. Relationships → code

| Diagram relationship | Multiplicity | Implemented as |
|---|---|---|
| Administrator / Manager / WarehouseStaff / SalesPersonnel **generalize** User | — | `Role` enum on `User` + one service per specialisation |
| Product **tracked** by StockRecord | 1 — 1..* | `StockRecord.product` (`@ManyToOne`), key (sku, location) |
| Product **analyzed** by Forecast | 1 — 0..* | `Forecast.product` (`@ManyToOne`), key (sku, location, period) |
| PurchaseOrder **contains** Product | * — 1..* | `PurchaseOrder.lineItems` (`@OneToMany` `PoLineItem`) → `PoLineItem.product` |
| SalesOrder **contains** Product | * — 1..* | `SalesOrder.lineItems` (`@OneToMany` `SalesOrderLineItem`) → `.product` |
| Supplier **fulfills** PurchaseOrder | 1 — 0..* | `PurchaseOrder.supplier` (`@ManyToOne`) |
| Manager **approves** PurchaseOrder | 1 — 0..* | `PurchaseOrder.manager` (`@ManyToOne User`) |
| WarehouseStaff **receives** PurchaseOrder | 1 — 0..* | `PurchaseOrder.warehouseStaff` (`@ManyToOne User`) |
| User **receives** Notification | 1 — 0..* | `Notification.user` (`@ManyToOne`) |

## 3. Deliberate, documented differences from the diagram

| Diagram | Implementation | Why |
|---|---|---|
| `Administrator`, `Manager`, … as Java subclasses of `User` | `Role` enum + a service class per role | Single `users` table (schema.md); RBAC enforced with `@PreAuthorize`; avoids JPA inheritance for classes that have no attributes of their own |
| `Notification.recipients : List` | one `Notification` row per recipient and channel | Gives each person their own read/unread status and a full delivery log (Notify.Log) |
| `line_items : List` on orders | `PoLineItem` / `SalesOrderLineItem` entities | Relational many-to-many through a line table with quantity and price |
| `Product.unit_price : double`, `Supplier.rating : double` | `BigDecimal` | Exact money/rating arithmetic; rating clamped to 0.00–5.00 (BR-4) |
| `Date` | `LocalDate` / `OffsetDateTime` | Java time API |
| `void` operations | return the affected entity or a result map | The REST layer needs the result; the call order still matches the sequence diagrams |

## 4. Beyond the diagram (added while implementing the SRS)

`NotificationPreference` (SRS `Notify.Preferences.Configure`), `ForecastAccuracy` (`Forecast.Accuracy.Track`), and the line-item tables above. These extend the model without changing any diagram class. They are in Flyway migrations V5 and V6.
