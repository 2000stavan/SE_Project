# Inventory and Stock Management System (ISMS)
## Consolidated Moodle Notes — Complete Source-Document Text

**Project:** Inventory and Stock Management System (ISMS), Release 1.0  
**Institution:** Sardar Patel Institute of Technology (SPIT), Mumbai  
**Course:** T.E. Computer Engineering — Software Engineering  
**Team members:**
- **Dev Gaglani** — UID `2024300057`
- **Stavan Desai** — UID `2024300042`

**Purpose of this file:** Consolidates the written content, requirements, class/code definitions, use cases, diagram explanations, and schedule information from all seven supplied PDFs into one structured Markdown document. Diagram images are represented by written descriptions of their visible participants, processes, relationships, and flows. Source inconsistencies and unresolved items are explicitly identified near the end rather than silently reconciled.

## Table of Contents

1. [Source Documents](#1-source-documents)
2. [Document A — Software Requirements Specification (SRS)](#2-document-a--software-requirements-specification-srs)
   - [A1. Introduction](#a1-introduction)
   - [A2. Overall Description](#a2-overall-description)
   - [A3. External Interface Requirements](#a3-external-interface-requirements)
   - [A4. System Features and Functional Requirements](#a4-system-features-and-functional-requirements)
   - [A5. Non-functional Requirements and Business Rules](#a5-non-functional-requirements-and-business-rules)
   - [A6. Other Requirements](#a6-other-requirements)
   - [A7. Glossary and Data Dictionary](#a7-glossary-and-data-dictionary)
   - [A8. Analysis Models and TBD List](#a8-analysis-models-and-tbd-list)
3. [Document B — Use Case Diagram and Use Case Descriptions](#3-document-b--use-case-diagram-and-use-case-descriptions)
4. [Document C — UML Class Diagram and Class Code](#4-document-c--uml-class-diagram-and-class-code)
5. [Document D — Sequence and Collaboration/Communication Diagrams](#5-document-d--sequence-and-collaborationcommunication-diagrams)
6. [Document E — UML Activity Diagram](#6-document-e--uml-activity-diagram)
7. [Document F — Data Flow Diagrams (DFD)](#7-document-f--data-flow-diagrams-dfd)
8. [Document G — Work Breakdown Structure and Project Schedule](#8-document-g--work-breakdown-structure-and-project-schedule)
9. [Consolidated System Flow and Traceability](#9-consolidated-system-flow-and-traceability)
10. [Source Inconsistencies, Editorial Issues, and Open Decisions](#10-source-inconsistencies-editorial-issues-and-open-decisions)
11. [Conclusions Consolidated from the Reports](#11-conclusions-consolidated-from-the-reports)

---

# 1. Source Documents

| Label in this consolidation | Supplied PDF | Main content | Length |
|---|---|---|---:|
| Document A | `SRS_Inventory_Stock_Management_System_Dev_Stavan (2).pdf` | Software Requirements Specification for ISMS, dated 10 August 2026 | 28 pages |
| Document B | `SE_USECASEDIAGRAM_Stavan_Dev (1) (1).pdf` | Use-case diagram and detailed descriptions of Manage Inventory, Manage Purchase Order, and Process Sales Order | 5 pages |
| Document C | `SE_EXP3_2024300042_Stavan_Dev (2).pdf` | Class diagram, noun/verb analysis, class relations, and Java-like class declarations | 6 pages |
| Document D | `SE_Exp4.1 (2).pdf` | Sequence/collaboration diagram theory and three behavioral scenarios | 9 pages |
| Document E | `2024300042_2024300057_SE_Exp5 (1) (3).pdf` | UML activity diagram, swimlanes, and workflow explanation | 3 pages |
| Document F | `SE_EXP6_Stavan_Dev (2).pdf` | DFD Level 0, Level 1, and Level 2 using Gane–Sarson notation | 5 pages |
| Document G | `ISMS_WBS_and_Project_Schedule_Stavan_Dev (1).pdf` | Work Breakdown Structure and Gantt project schedule | 6 pages |

The documents describe one system and are intended to be read together: the SRS states what ISMS must do; the use-case model describes actor-facing behavior; the class diagram defines principal data/classes and methods; sequence and activity diagrams describe behavior over time; the DFDs describe data movement; and the WBS/schedule decomposes and times the project work.

---

# 2. Document A — Software Requirements Specification (SRS)

**Document title:** *Software Requirements Specification for Inventory and Stock Management System (ISMS)*  
**Prepared by:** Dev Gaglani (`2024300057`) and Stavan Desai (`2024300042`)  
**Institution:** Sardar Patel Institute of Technology (SPIT)  
**Date:** 10 August 2026  
**Target release:** Version 1.0

## A1. Introduction

### A1.1 Purpose

The SRS specifies the functional and non-functional requirements for ISMS Version 1.0. It describes a web-based platform, supplemented by hands-free voice interaction on the warehouse floor, through which Administrators, Managers, Warehouse Staff, and Sales Personnel can manage inventory, suppliers, purchase orders, and sales across physical and digital channels from one system.

The document is intended for the team responsible for designing, implementing, and verifying the system. Unless stated otherwise, requirements are High or Medium priority and target Release 1.0.

### A1.2 Document Conventions

- Functional requirements use dot-notation tags of the form `Feature.Sub-feature.Detail`, such as `Voice.Command.Interpret`.
- Each system feature states a priority: High, Medium, or Low. Individual requirements inherit the feature priority unless another priority is explicitly stated.
- The source uses bold formatting for requirement tags and defined terms, and italic formatting for stimulus/response labels.

### A1.3 Intended Audience and Reading Suggestions

The intended audience is the development team, QA engineers, project mentors, and stakeholders evaluating ISMS as a case-study project.

- Readers seeking a high-level overview should read Sections 1 and 2.
- Developers and testers should focus on Sections 3, 4, and 5, which contain interface requirements and detailed, verifiable requirements.
- Section 4 is organized by system feature, so a reader can go directly to a relevant feature.

### A1.4 Product Scope

ISMS digitizes the end-to-end stock-management lifecycle: supplier onboarding and purchase ordering, voice-enabled warehouse operations, omnichannel sales fulfilment, and predictive reordering. It is intended to replace fragmented manual processes such as spreadsheets, paper stock registers, and disconnected marketplace dashboards.

Release 1.0's distinguishing capabilities are:

1. Hands-free voice-enabled inventory CRUD operations for Warehouse Staff.
2. AI/ML-driven forecasting that predicts demand and recommends reorder points.
3. Real-time stock synchronization across connected physical and digital sales channels.
4. A unified environment for Administrators, Managers, Warehouse Staff, and Sales Personnel.

Potential future releases may add native mobile applications, more voice languages, and additional marketplace integrations.

### A1.5 References listed by the SRS

- Karl Wiegers, *Software Requirements Specification templates and examples*, Process Impact — used as reference material for document structure.
- *Inventory and Stock Management System Vision and Scope Document* — marked as a separate document to be prepared.
- *Organization UI/UX Style Guide*, version — placeholder not completed in the source.
- *Marketplace Webhook API Documentation*, marketplace provider names — provider details are placeholders.
- *Speech-to-Text and Text-to-Speech Engine API Documentation*, provider name — provider detail is a placeholder.

## A2. Overall Description

### A2.1 Product Perspective

ISMS is a new, self-contained web application with a companion hands-free warehouse voice interface; it is not a follow-on to an existing system. It integrates with four categories of external systems:

1. **Marketplaces and the organization's own storefront:** Webhooks for omnichannel order events and stock synchronization.
2. **Speech-to-Text/Text-to-Speech engine:** Voice interaction and audio warehouse alerts.
3. **ML Forecasting Service:** Demand prediction and reorder-point calculation.
4. **E-mail/SMS Gateway and Payment/Invoicing Gateway:** Notifications and digital-sales processing/invoicing.

### A2.2 Product Functions

Release 1.0 provides seven major function areas:

1. **Authentication and Role-Based Access Control:** Secure login and role-specific access for Administrators, Managers, Warehouse Staff, and Sales Personnel.
2. **Voice-Enabled Inventory and Omnichannel Sync:** Full CRUD operations on stock through standard UI or hands-free voice commands, with real-time synchronization across sales channels.
3. **Supplier Management:** Vendor profiles, contact details, performance history, and procurement records.
4. **Purchase Order Management:** Create, approve, and track inbound purchase orders; update stock automatically upon confirmed receipt.
5. **Sales Tracking and Order Management:** Record physical and digital sales; process marketplace webhooks; generate invoices; automatically deduct stock upon order confirmation.
6. **Predictive Analytics and AI Forecasting:** Revenue and stock-status dashboards, seasonality and demand prediction, and reorder-point recommendations.
7. **Multimodal Notification System:** Real-time low-stock and shipping-delay alerts by text/e-mail and text-to-speech warehouse audio.

### A2.3 User Classes and Characteristics

| User class | Responsibilities and characteristics |
|---|---|
| **Administrator** | Configures the system; manages user accounts and role permissions; oversees warehouses/stores; has unrestricted access to modules including analytics and audit logs. Technically proficient; typically infrequent but high-privilege use. |
| **Manager** | Oversees day-to-day inventory at one or more locations; approves purchase orders; reviews supplier performance; monitors dashboards and forecasts; manages staff assignments. Frequent daily use. |
| **Warehouse Staff** | Performs physical stock operations such as receiving, put-away, picking, and cycle counts. Uses standard UI or hands-free voice commands on a handheld/wearable device; often has hands occupied while working. |
| **Sales Personnel** | Logs in-store sales and handles customer-facing order queries at point-of-sale terminals; views real-time cross-channel availability before promising delivery dates. Frequent use during business hours. |

### A2.4 Operating Environment

- **OE-1:** The web application shall run on current versions of Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari.
- **OE-2:** The application shall be deployed on a Linux-based cloud application server with horizontal scalability for peak order-processing and voice-command loads.
- **OE-3:** The warehouse voice interface shall operate on Android-based handheld scanners or wearable devices with a microphone and speaker.
- **OE-4:** All user classes shall be able to access the system over the public Internet using HTTPS/TLS.

### A2.5 Design and Implementation Constraints

- **CO-1:** Personally identifiable information, including staff and supplier contact details, shall be encrypted at rest and in transit.
- **CO-2:** A relational database engine shall preserve referential integrity between products, stock records, suppliers, purchase orders, and sales orders.
- **CO-3:** Externally facing APIs, including marketplace webhook endpoints, shall use JSON over HTTPS.
- **CO-4:** If speech-recognition confidence falls below a configurable threshold, the voice module shall degrade gracefully to standard UI input.

### A2.6 User Documentation

- **UD-1:** Contextual online help shall be accessible from every major screen.
- **UD-2:** Each of the four roles shall have a short first-time onboarding walkthrough, including a guided demonstration of supported voice commands.

### A2.7 Assumptions and Dependencies

- **AS-1:** Warehouse Staff devices have a working microphone and speaker, and ambient noise is reasonable for voice recognition.
- **AS-2:** Connected marketplaces provide a stable webhook mechanism for order events. Manual sales entry mitigates temporary webhook outages.
- **DE-1:** Predictive Analytics depends on a minimum volume of historical sales and stock data from the Sales Tracking and Purchase Order modules.
- **DE-2:** Multimodal Notification depends on the continued availability of the Text-to-Speech engine and E-mail/SMS gateway.

## A3. External Interface Requirements

### A3.1 User Interfaces

- **UI-1:** Provide role-specific dashboards for Administrators, Managers, Warehouse Staff, and Sales Personnel using a shared visual design system.
- **UI-2:** Every screen shall include a persistent help link and consistent primary navigation.
- **UI-3:** The Warehouse Staff interface shall visibly indicate voice-command states: listening, processing, and confirmation.
- **UI-4:** Forms shall validate inline and display field-level error messages before submission.

### A3.2 Hardware Interfaces

- **HI-1:** The voice-enabled inventory feature shall use the host device's microphone for command capture and speaker for audio confirmations/alerts.
- **HI-2:** Sales Tracking shall interface with barcode scanners at point-of-sale terminals for physical sales entry.

### A3.3 Software Interfaces

| Interface | Purpose specified by the SRS |
|---|---|
| **Marketplace Webhook Gateway** | Receives real-time `created`, `paid`, `cancelled`, and `returned` order notifications from connected marketplaces and the storefront for omnichannel synchronization. |
| **Speech-to-Text / Voice Command Engine** | Converts spoken warehouse commands, e.g. “add twenty units to bin A12”, into structured inventory operations. |
| **Text-to-Speech (TTS) Engine** | Converts system alerts and confirmations into spoken audio for hands-free warehouse broadcast. |
| **ML Forecasting Service** | Accepts historical sales/stock data and returns demand predictions and recommended reorder quantities/points. |
| **Payment / Invoicing Gateway** | Processes payment capture for digital sales and generates itemized invoices for physical and online orders. |
| **E-mail / SMS Gateway** | Delivers text alerts for low stock, shipping delays, and order events to registered users. |

### A3.4 Communications Interfaces

- **CI-1:** Send e-mail or SMS alerts to relevant Managers when a SKU's stock falls below its configured reorder point.
- **CI-2:** Broadcast text-to-speech audio over connected warehouse speakers for high-priority stock and shipping-delay events.
- **CI-3:** Communications containing payment or personal data shall use encrypted channels.

## A4. System Features and Functional Requirements

### A4.1 Authentication and Role-Based Access Control

**Priority:** High.  
**Purpose:** Secure user login and restrict functions/data according to assigned role: Administrator, Manager, Warehouse Staff, or Sales Personnel.

**Stimulus/response sequences**

- User submits credentials → system verifies them and grants role-scoped access if valid.
- Administrator assigns or changes a role → system updates permitted functions and data access.
- User tries to access a function outside their role → system denies access and displays an appropriate message.

**Requirements**

- **`Auth.Login`:** Authenticate using username/employee ID and password before allowing access to anything beyond the login screen.
- **`Auth.Login.Fail`:** Display a generic error for invalid credentials and lock the account after five consecutive failed attempts within 15 minutes.
- **`Auth.Password.Reset`:** Allow password reset for a forgotten password via a verified e-mail address.
- **`Auth.RBAC.Roles`:** Support at least four role types (Administrator, Manager, Warehouse Staff, Sales Personnel), each with a distinct configurable permission set.
- **`Auth.RBAC.Assign`:** Allow an Administrator to assign/change any user account's role.
- **`Auth.RBAC.Enforce`:** Restrict every module/function strictly according to the logged-in user's assigned role.
- **`Auth.Session.Timeout`:** Automatically log out users after 30 minutes of inactivity.
- **`Auth.Audit.Log`:** Create a timestamped audit log entry for every login, logout, and role change.

### A4.2 Voice-Enabled Inventory and Omnichannel Synchronization

**Priority:** High.  
**Purpose:** Enable authorized stock CRUD operations through standard UI or hands-free voice commands, with real-time synchronization across all sales channels.

**Stimulus/response sequences**

- Warehouse Staff speaks a command to add/adjust stock at a bin → system interprets it, audibly confirms the interpretation, and updates stock after verbal confirmation.
- A stock record is created/updated/deleted through any channel → system propagates the quantity to the physical store, own storefront, and connected marketplaces.
- Recognition confidence is low → system asks the user to repeat the command or switches to standard UI input.

**Requirements**

- **`Inventory.CRUD.Create`:** Authorized users can create a SKU with name, category, unit of measure, unit price, and reorder point.
- **`Inventory.CRUD.Update`:** Authorized users can update quantity on hand, location, or attributes of an existing SKU.
- **`Inventory.CRUD.Delete`:** Allow SKU deactivation only if it has zero quantity on hand across all locations.
- **`Voice.Command.Capture`:** Capture Warehouse Staff speech and convert it to text using the Speech-to-Text engine.
- **`Voice.Command.Interpret`:** Parse transcribed text into a structured operation containing action, SKU, quantity, and location.
- **`Voice.Command.Confirm`:** Audibly repeat the interpreted operation and require verbal or tap confirmation before committing it.
- **`Voice.Command.LowConfidence`:** Below a configurable recognition-confidence threshold, ask the user to repeat or use standard UI input.
- **`Sync.Channel.Realtime`:** Propagate any stock-quantity change to connected sales channels within five seconds.
- **`Sync.Channel.Conflict`:** When two channels simultaneously reserve the last available SKU unit, grant the reservation to the first confirmed transaction and reject the other with an out-of-stock message.
- **`Inventory.Search`:** Search/filter stock records by SKU, category, location, and quantity range.

### A4.3 Supplier Management

**Priority:** Medium.  
**Purpose:** Maintain vendor profiles, contact details, performance history, and procurement records to support sourcing decisions.

**Stimulus/response sequences**

- Manager adds a supplier → system records its profile/contact details.
- A supplier PO completes or is delayed → system updates performance history, including on-time rate and quality flags.
- Manager searches for a supplier by product category → system presents matching profiles ranked by performance rating.

**Requirements**

- **`Supplier.Create`:** Manager or Administrator can create a profile with company name, contact person, phone, e-mail, address, and supplied product categories.
- **`Supplier.Edit`:** Authorized users can edit an existing supplier profile.
- **`Supplier.Performance.Track`:** Automatically update on-time delivery rate and order-accuracy rate based on completed POs.
- **`Supplier.Performance.View`:** Display each supplier's history, including past POs, delivery timeliness, and quality issue flags.
- **`Supplier.Search`:** Search/filter suppliers by name, product category, and performance rating.
- **`Supplier.Deactivate`:** Only an Administrator can deactivate a supplier, and only when no POs with that supplier are currently open.

### A4.4 Purchase Order (PO) Management

**Priority:** High.  
**Purpose:** Create, approve, and track inbound POs, and increase stock counts across all channels after confirmed receipt.

**Stimulus/response sequences**

- Manager creates a PO for one or more SKUs from a supplier → system validates it and routes it for approval.
- Administrator approves a pending PO → system marks it Approved and sends it to the supplier.
- Warehouse Staff confirms receipt against an approved PO → system increases stock for the received items across connected channels.

**Requirements**

- **`PO.Create`:** Manager can create a PO specifying supplier, one or more SKUs, quantities, and expected delivery date.
- **`PO.Approve`:** Administrator or Manager approval, under configured approval limits, is required before the PO is sent to the supplier.
- **`PO.Approve.Reject`:** An approver can reject a PO with a reason, returning it to the creator for revision.
- **`PO.Status.Track`:** Track statuses `Draft`, `Pending Approval`, `Approved`, `Partially Received`, `Received`, and `Cancelled`.
- **`PO.Receive.Confirm`:** Warehouse Staff can confirm receipt against an approved PO and specify quantity received per line item.
- **`PO.Receive.Partial`:** If received quantity is less than ordered quantity, mark it Partially Received and leave the outstanding quantity open.
- **`PO.Receive.StockUpdate`:** On confirmed receipt, automatically increase quantity on hand for every received SKU across connected sales channels.
- **`PO.Overdue.Flag`:** Flag a PO as overdue when its expected delivery date has passed without full receipt.

### A4.5 Sales Tracking and Order Management

**Priority:** High.  
**Purpose:** Record physical and digital sales, process marketplace webhooks, generate invoices, and deduct stock on order confirmation.

**Stimulus/response sequences**

- Sales Personnel logs an in-store sale → system deducts sold quantity and generates an invoice.
- A connected marketplace sends an order webhook → system creates a sales order, reserves stock, and deducts quantity upon payment confirmation.
- Customer requests return/cancellation → system reverses the stock deduction and updates the order status.

**Requirements**

- **`Sales.Physical.Log`:** Sales Personnel can log a physical sale by scanning or selecting SKUs and quantities at the point of sale.
- **`Sales.Webhook.Receive`:** Accept `order-created`, `order-paid`, `order-cancelled`, and `order-returned` events from connected marketplaces.
- **`Sales.Webhook.Validate`:** Verify incoming webhook authenticity using the marketplace's signature-verification mechanism before processing.
- **`Sales.Order.Create`:** On a valid order event, create/update a sales-order record with channel, line items, and status.
- **`Sales.Stock.Deduct`:** Automatically deduct ordered quantities from stock on hand upon order confirmation for physical and digital sales.
- **`Sales.Stock.Insufficient`:** If available stock is insufficient, reject the order line and notify the responsible Manager.
- **`Invoice.Generate`:** Automatically generate a PDF invoice for each completed sale, itemizing products, quantities, prices, and taxes.
- **`Sales.Return.Process`:** Authorized users can process returns/cancellations and reverse the stock deduction for returned quantities.
- **`Sales.Order.View`:** Sales Personnel and Managers can view/filter orders by channel, date range, and status.

### A4.6 Predictive Analytics and AI Forecasting

**Priority:** Medium.  
**Purpose:** Summarize revenue and stock status and use ML to predict seasonality, future demand, and optimal reorder points.

**Stimulus/response sequences**

- Manager opens analytics dashboard → system displays revenue, stock status, and trend charts for selected locations/date ranges.
- Scheduled forecasting job runs → system produces updated demand forecasts and recommended reorder points for each SKU.
- A SKU approaches its recommended reorder point → system suggests creating a pre-filled PO with the recommended quantity.

**Requirements**

- **`Analytics.Dashboard.Revenue`:** Show revenue by channel, location, and time period.
- **`Analytics.Dashboard.Stock`:** Show current stock status, including low-stock and overstock SKUs, across locations.
- **`Forecast.Demand.Generate`:** Generate forecasts for each active SKU on a recurring schedule, using historical sales and seasonality data.
- **`Forecast.Seasonality.Detect`:** Account for detected seasonal patterns, such as recurring weekly or monthly demand cycles.
- **`Forecast.Reorder.Recommend`:** Calculate/display recommended reorder point and reorder quantity based on forecast demand and supplier lead time.
- **`Forecast.Reorder.Suggest`:** When stock on hand approaches the recommended reorder point, suggest a pre-filled PO.
- **`Forecast.Accuracy.Track`:** Record forecast-versus-actual demand per SKU to support ongoing model evaluation.

### A4.7 Multimodal Notification System

**Priority:** Medium.  
**Purpose:** Issue real-time low-stock and shipping-delay alerts through text/e-mail and automated text-to-speech warehouse audio.

**Stimulus/response sequences**

- Stock on hand falls below reorder point → send low-stock alert to the responsible Manager by e-mail/SMS and broadcast warehouse audio.
- An approved PO becomes overdue → send a shipping-delay alert to the responsible Manager.
- User configures notification preferences → future alerts use only the selected channels.

**Requirements**

- **`Notify.LowStock.Trigger`:** Generate a low-stock alert whenever a SKU's quantity on hand falls below its configured reorder point.
- **`Notify.ShippingDelay.Trigger`:** Generate a shipping-delay alert whenever a PO is flagged overdue according to `PO.Overdue.Flag`.
- **`Notify.Channel.EmailSMS`:** Send text alerts by e-mail and/or SMS to recipients configured for that alert type.
- **`Notify.Channel.Audio`:** Convert high-priority alerts to speech with the TTS engine and broadcast over connected warehouse audio devices.
- **`Notify.Preferences.Configure`:** Allow users to choose alert types and delivery channels (e-mail, SMS, audio).
- **`Notify.Log`:** Log every notification sent, including type, channel, recipient, and delivery status.

## A5. Non-functional Requirements and Business Rules

### A5.1 Performance Requirements

- **`PE-1`:** Support at least 100 concurrent Warehouse Staff issuing voice commands, with response time no greater than three seconds per command.
- **`PE-2`:** Propagate a stock-quantity change to all connected sales channels within five seconds of the triggering transaction.
- **`PE-3`:** Process a marketplace webhook and update its sales order within ten seconds of receipt.
- **`PE-4`:** Complete the scheduled forecasting job for the full product catalogue within 30 minutes.

### A5.2 Safety Requirements

- **`SA-1`:** Safety-critical control functions, such as forklift or conveyor operation, are outside scope; the system provides inventory and order information only.
- **`SA-2`:** Warehouse audio alerts shall stay within configured volume limits so they do not interfere with other safety announcements.

### A5.3 Security Requirements

- **`SE-1`:** Encrypt network transactions involving payment or personally identifiable information using TLS 1.2 or higher.
- **`SE-2`:** Require authentication before access to any function other than the login screen.
- **`SE-3`:** Enforce RBAC so each role can access only the functions and data permitted for that role.
- **`SE-4`:** Transmit voice-command audio to the Speech-to-Text engine over an encrypted channel and do not permanently store the audio beyond the interval needed for transcription.
- **`SE-5`:** Log all authentication, stock-changing, PO, and sales transactions for audit purposes.

### A5.4 Software Quality Attributes

- **`Availability-1`:** Target 99.5% system availability, with priority uptime during standard warehouse operating hours.
- **`Usability-1`:** A first-time Warehouse Staff user should be able to complete a basic voice-guided stock adjustment after one onboarding walkthrough.
- **`Scalability-1`:** Support horizontal scaling to handle order spikes after promotional sales events.
- **`Robustness-1`:** If connectivity is lost during a voice-command transaction, queue the command locally and synchronize it when connectivity returns.

### A5.5 Business Rules

- **`BR-1`:** Only a Manager or Administrator may create, approve, or reject a PO.
- **`BR-2`:** A PO may not be approved if it would make the supplier's outstanding order value exceed a configurable credit limit.
- **`BR-3`:** Stock on hand must never fall below zero; reject a sale or deduction exceeding available stock.
- **`BR-4`:** Recalculate supplier performance rating only after a PO reaches `Received` or `Cancelled` status.
- **`BR-5`:** Only an Administrator may deactivate a user account or supplier profile.

## A6. Other Requirements

- **Internationalization:** Release 1.0 targets English-language voice commands and UI text. Use UTF-8 throughout the data model to simplify future localization.
- **Legal:** Present Terms of Service and a Privacy Policy for acceptance during account creation. Comply with applicable data-protection regulations for supplier and staff personal data.
- **Reuse / future releases:** Later releases may add more voice languages and more marketplace integrations; these are outside Release 1.0 scope.

## A7. Glossary and Data Dictionary

### A7.1 Glossary

- **Bin / Location:** A uniquely identified physical storage position in a warehouse/store to which SKUs are assigned.
- **Omnichannel Sync:** Keeping stock counts consistent in real time across the physical store, own website, and third-party marketplaces.
- **PO (Purchase Order):** A formal request to a Supplier for a specified quantity of goods.
- **Reorder Point:** The stock level at which a new PO should be triggered to avoid a stockout; calculated from lead time and forecast demand.
- **SKU (Stock Keeping Unit):** A unique identifier for a distinct product or product variant.
- **Supplier / Vendor:** An external party from whom inventory items are procured.
- **Voice Command:** A spoken instruction from Warehouse Staff interpreted by the Speech-to-Text engine to perform an inventory CRUD operation.
- **Webhook:** An automated, real-time HTTP callback sent by a marketplace to report a sales event.

### A7.2 Data Dictionary

#### User

Fields: `user_id`, `name`, `email`, `role`, `hashed_password`, `status`.

- `user_id`: Unique identifier for a user account.
- `name`: Name associated with the account.
- `email`: User account e-mail address.
- `role`: One of `Administrator`, `Manager`, `Warehouse Staff`, `Sales Personnel`.
- `hashed_password`: Securely stored representation of the password.
- `status`: Account state, for example active or inactive.

#### Product / SKU

Fields: `sku_id`, `name`, `category`, `unit_price`, `reorder_point`, `unit_of_measure`.

- `sku_id`: Unique identifier for a product or product variant.
- `name`: Product name/description.
- `category`: Product category.
- `unit_price`: Selling price per unit.
- `reorder_point`: Stock level at which replenishment is recommended.
- `unit_of_measure`: Quantity unit such as pieces, kilograms, or litres.

#### Stock Record

Fields: `sku_id`, `warehouse/store_id`, `quantity_on_hand`, `quantity_reserved`, `last_updated`.

- `sku_id`: Product whose inventory is represented.
- `warehouse/store_id`: Location where the stock is held.
- `quantity_on_hand`: Current physical quantity at that location.
- `quantity_reserved`: Quantity reserved for confirmed or pending sales orders.
- `last_updated`: Date/time when the record was most recently modified.

#### Supplier

Fields: `supplier_id`, `name`, `contact_details`, `rating`, `lead_time`, `procurement_history`.

- `supplier_id`: Unique supplier identifier.
- `name`: Supplier/vendor name.
- `contact_details`: Telephone, e-mail, address, and other contact information.
- `rating`: Supplier performance rating based on delivery and order-accuracy history.
- `lead_time`: Expected time between issuing a PO and receipt of goods.
- `procurement_history`: Previous POs and supplier performance history.

#### Purchase Order

Fields: `po_id`, `supplier_id`, `line_items`, `status`, `order_date`, `expected/received_date`.

- `po_id`: Unique PO identifier.
- `supplier_id`: Supplier to whom the PO is issued.
- `line_items`: Products and quantities requested.
- `status`: `Draft`, `Pending Approval`, `Approved`, `Partially Received`, `Received`, or `Cancelled`.
- `order_date`: Date created.
- `expected/received_date`: Expected delivery date or actual receipt date.

#### Sales Order

Fields: `order_id`, `channel`, `customer_information`, `line_items`, `status`, `payment_reference`.

- `order_id`: Unique sales-order identifier.
- `channel`: Source channel, e.g. physical store, own storefront, or connected marketplace.
- `customer_information`: Information associated with the customer.
- `line_items`: Products and quantities in the order.
- `status`: Current sales-order processing status.
- `payment_reference`: Reference identifying the associated payment transaction.

The entity supports physical and digital sales, including marketplace webhook processing and stock deduction.

#### Forecast

Fields: `sku_id`, `location_id`, `forecast_period`, `predicted_demand`, `recommended_reorder_quantity`.

- `sku_id`: Product being forecast.
- `location_id`: Warehouse/store location for the forecast.
- `forecast_period`: Future period covered.
- `predicted_demand`: Estimated quantity required during the period.
- `recommended_reorder_quantity`: Quantity suggested to replenish inventory.

Forecasts use historical sales and seasonality information and produce recommended reorder points and quantities.

#### Notification

Fields: `notification_id`, `type`, `channel`, `recipient(s)`, `message`, `timestamp`, `status`.

- `notification_id`: Unique notification identifier.
- `type`: `Low Stock`, `Shipping Delay`, `Order Update`, or `Other Alert`.
- `channel`: `E-mail`, `SMS`, or `Audio`.
- `recipient(s)`: Intended user or users.
- `message`: Notification content.
- `timestamp`: Date/time generated or sent.
- `status`: Delivery status.

Notification requirements specifically include low-stock and shipping-delay alerts and support e-mail, SMS, and audio delivery channels.

### A7.3 Principal Data Relationships

1. A User manages or operates on multiple Products/SKUs.
2. A Product/SKU may have multiple Stock Records across warehouses or stores.
3. A Supplier may be associated with multiple Purchase Orders.
4. A Purchase Order contains one or more Products as line items.
5. A Sales Order contains one or more Products as line items.
6. A Sales Order is associated with a payment reference.
7. A Product/SKU may have multiple Forecast records for different locations or forecast periods.
8. A User may receive multiple Notifications.
9. A Stock Record is associated with a particular product and warehouse/store location.

## A8. Analysis Models and TBD List

### A8.1 Purchase Order Status Transitions

The SRS gives the following status transitions:

- `Draft` → `Pending Approval`: Manager submits the PO for approval.
- `Pending Approval` → `Approved`: Administrator or Manager approves within their approval limit.
- `Pending Approval` → `Draft`: Approver rejects the PO with a reason; it returns to the creator.
- `Approved` → `Partially Received`: Warehouse Staff confirms receipt of less than the full ordered quantity.
- `Partially Received` or `Approved` → `Received`: Warehouse Staff confirms receipt of all outstanding quantity.
- `Approved` or `Pending Approval` → `Cancelled`: Manager or Administrator cancels before receipt.

### A8.2 Core Data Entities Summary

| Entity | Key attributes |
|---|---|
| User | user ID, name, e-mail, role, hashed password, status |
| Product / SKU | SKU ID, name, category, unit price, reorder point, unit of measure |
| Stock Record | SKU ID, warehouse/store ID, quantity on hand, quantity reserved, last updated |
| Supplier | supplier ID, name, contact details, rating, lead time, procurement history |
| Purchase Order | PO ID, supplier ID, line items, status, order date, expected/received date |
| Sales Order | order ID, channel, customer information, line items, status, payment reference |
| Forecast | SKU ID, location ID, forecast period, predicted demand, recommended reorder quantity |
| Notification | notification ID, type, channel, recipients, message, timestamp, status |

### A8.3 To Be Determined (TBD) List

- **TBD-1:** Final supported voice-command phrases and supported languages/accents for Release 1.0.
- **TBD-2:** Exact marketplaces (examples in the source: Amazon and Flipkart) to be integrated in Release 1.0 versus later releases.
- **TBD-3:** ML forecasting algorithm/library and minimum historical data volume required for reliable predictions.
- **TBD-4:** Specific warehouse hardware (handheld scanners or wearable microphone/speaker devices) to certify for compatibility.
- **TBD-5:** Data-retention period for historical sales/stock data used in forecasting.

---

# 3. Document B — Use Case Diagram and Use Case Descriptions

**Document title:** Use Case Diagram / Use Case Description for ISMS  
**Team:** Stavan Desai (`2024300042`), Dev Gaglani (`2024300057`)

## B1. Aim

Represent the major interactions between ISMS, its users, and external systems. The document provides a use-case diagram and detailed flow descriptions for Manage Inventory, Manage Purchase Order, and Process Sales Order.

## B2. Main Actors in the Use-Case Diagram

### Internal user roles

- **Administrator:** Manage Users and Roles; Manage System Configuration; View System Reports and Audit Logs.
- **Manager:** Manage Suppliers; Manage Purchase Orders; View Analytics Dashboard; Generate Demand Forecast; participate in inventory/stock oversight.
- **Warehouse Staff (Voice Interface):** Manage Inventory (Stock); View Stock and Warehouse Information; use voice-command operations.
- **Sales Personnel:** Process Sales Order (Physical/Digital); Process Returns/Cancellations.

### External actors/services

- ML Forecasting Service
- Speech-to-Text / Text-to-Speech Service
- Supplier/Vendor
- Marketplace/E-commerce Platform
- Payment/Invoicing Gateway
- E-mail/SMS Gateway

## B3. Use Cases and Relationships Visible in the Diagram

The system boundary is titled **Inventory and Stock Management System (ISMS), Release 1.0**.

- **Manage Inventory (Stock)** is connected with stock operations: Add Stock, Update Stock, Adjust Stock, Delete Stock, and Search/View Inventory. The diagram shows these as included operations. Low Stock Alert (Notification), Shipping Delay Alert (Notification), and Voice Command (Hands-free Operation) are shown as extension/conditional behaviors associated with inventory operations.
- **Purchase-order flow:** Create Purchase Order → Approve Purchase Order → Receive Goods / Update Stock. Calculate Total (PO) is shown as an included sub-use case associated with PO creation.
- **Sales flow:** Process Sales Order (Physical/Digital) → Validate Order and Stock → Record Order → Process Payment → Generate Invoice. Related operations include inventory reserve/deduct, update payment status, send order confirmation, and external payment/invoicing or marketplace interaction.
- **Returns/cancellations flow:** Process Returns/Cancellations → Validate Return Request → Update Inventory (Restore Stock) → Process Refund/Credit → Notify Customer.
- **Forecasting:** Get Historical Sales Data and Get Seasonality Factors feed the ML Forecasting Service and relate to the forecasting/dashboard use cases.
- **Voice and alerts:** Speech-to-Text/Text-to-Speech supports voice interaction; E-mail/SMS Gateway supports notifications; stock and PO conditions can trigger alerts.

The diagram distinguishes ordinary associations from `<<include>>` and `<<extend>>` relationships. The source conclusion states that these relationships show how common and conditional activities are connected.

## B4. Use Case 1 — Manage Inventory

| Field | Description |
|---|---|
| **Use Case Name** | Manage Inventory |
| **Actors** | Warehouse Staff (primary); Manager (secondary) |
| **Preconditions** | User is authenticated and has the required permissions. Product/SKU and Stock Record data exists in the system. |
| **Postconditions** | Inventory data is successfully created/updated/deleted; stock levels and last-updated timestamp are updated. |

### Normal flow

1. Actor navigates to the Inventory module.
2. System displays a list of products/SKUs with current stock across locations.
3. Actor selects Add, Update, Adjust, Delete, or Search.
4. System displays the relevant form/details.
5. Actor enters or updates the required information.
6. System validates the information.
7. System saves changes to the inventory database.
8. If stock falls below the reorder point, system triggers a low-stock alert.
9. System displays a success message and refreshes inventory details.

### Alternative flows and exceptions

- **3a — Invalid operation selected:** System displays an error and asks the actor to select a valid operation.
- **5a — Invalid data entered:** System displays validation errors and does not save changes.
- **7a — Database update failure:** System rolls back the transaction and displays an error message.

### Non-functional requirements in this use case

- **Performance:** Inventory operations should complete within 3 seconds.
- **Security:** Only authorized users can perform inventory operations.
- **Reliability:** Data consistency must be maintained during updates.
- **Usability:** Interface should be simple and voice-enabled for supported operations.

## B5. Use Case 2 — Manage Purchase Order

| Field | Description |
|---|---|
| **Use Case Name** | Manage Purchase Order |
| **Actors** | Manager (primary); Supplier (external) |
| **Preconditions** | User is authenticated and permitted to manage POs; products/SKUs and suppliers exist. |
| **Postconditions** | PO is created/approved and sent to supplier; on receipt, stock levels and PO status are updated. |

### Normal flow

1. Manager navigates to the Purchase Order module.
2. System displays the list of POs.
3. Manager selects **Create Purchase Order**.
4. System displays the PO-creation form.
5. Manager selects a supplier and adds products with quantities.
6. System calculates the total amount.
7. Manager submits the PO for approval.
8. Approver reviews and approves the PO.
9. System sends the approved PO to the supplier.
10. When goods are received, system updates stock and marks the PO as Received.

### Alternative flows and exceptions

- **5a — Product out of stock in current inventory:** System displays current stock and recommended reorder quantity.
- **7a — Approval rejected:** In this use-case document, the PO status is set to Cancelled and the Manager is notified.
- **10a — Partial receipt:** PO status becomes Partially Received and remaining items stay pending.
- **10b — Receipt failure:** System displays an error and does not update stock.

### Non-functional requirements in this use case

- **Performance:** PO operations should complete within 5 seconds.
- **Security:** Only authorized users can create and approve POs.
- **Reliability:** Stock update on receipt must be accurate.
- **Auditability:** All PO actions must be logged.

## B6. Use Case 3 — Process Sales Order

| Field | Description |
|---|---|
| **Use Case Name** | Process Sales Order |
| **Actors** | Sales Personnel (primary); Customer (external) |
| **Preconditions** | User is authenticated and has permission to process sales orders; products/SKUs are available in inventory. |
| **Postconditions** | Sales order is created and confirmed; payment is recorded, invoice is generated, and stock is updated. |

### Normal flow

1. Sales Personnel navigates to the Sales Order module.
2. System displays options to create a new order.
3. Sales Personnel enters customer details and adds products to the order.
4. System validates product availability.
5. System calculates total amount.
6. Sales Personnel confirms the order.
7. Customer makes payment (online or offline).
8. System processes the payment.
9. System generates invoice and order confirmation.
10. System deducts stock and updates inventory.

### Alternative flows and exceptions

- **4a — Insufficient stock:** System notifies the user and suggests an alternate quantity or backorder.
- **7a — Payment failure:** System does not confirm the order and permits payment retry.
- **8a — Payment gateway unavailable:** System displays an error and permits selection of another payment method.
- **9a — Invoice-generation failure:** System logs the error and permits retry.

### Non-functional requirements in this use case

- **Performance:** Order processing should complete within 5 seconds.
- **Security:** Payment data must be encrypted and PCI-DSS compliant.
- **Reliability:** Payment and inventory updates must be accurate.
- **Usability:** Support both online and offline sales scenarios.

## B7. Conclusion in the Use-Case Document

The model identifies key actors and their functions, while `<<include>>` and `<<extend>>` relationships connect common and conditional activities. The three detailed descriptions specify normal flows, alternative flows, postconditions, and non-functional requirements, modelling functional requirements from the user perspective.

---

# 4. Document C — UML Class Diagram and Class Code

**Document title:** SE Experiment 3 — Class Diagram  
**Batch:** A3  
**Team:** Stavan Desai and Dev Gaglani

## C1. Aim and Implementation Approach

**Aim:** Draw a class diagram for the Inventory and Stock Management System.

The team revisited the SRS and problem description to identify nouns/noun phrases, removed ambiguity, identified core data classes, and documented class relationships and inheritance. The classes were then mapped to attributes and functions required by the system.

## C2. Problem Description

ISMS must track, control, and optimize inventory across multiple warehouses and omnichannel retail endpoints, and authorize different user types according to RBAC.

- Administrators manage roles and system-wide configuration.
- Managers oversee suppliers/vendor performance and approve/reject POs.
- Warehouse Staff confirm physical receipt of goods and use voice commands to update stock.
- Sales Personnel record physical sales and returns; the system captures digital sales through marketplace webhooks.
- The system keeps real-time stock records for each Product/SKU, deducts stock upon order confirmation, and generates invoices.
- An automated forecasting module analyses historical data, predicts demand, recommends reorder points, and triggers audio/e-mail/SMS alerts for low stock or shipping delays.

## C3. Noun/Noun-Phrase Analysis

Inventory, Stock, Administrator, Manager, Warehouse Staff, Sales Personnel, System, Product, SKU, Stock Record, Bin, Location, Omnichannel, Supplier, Vendor, Purchase Order, Sales Order, Invoice, Marketplace, Webhook, Speech-to-Text Engine, ML Forecasting Service, Forecast, Reorder Point, Seasonality, Notification, Alert, Customer, Payment.

## C4. Classes Identified

`User`, `Administrator`, `Manager`, `WarehouseStaff`, `SalesPersonnel`, `Product`, `StockRecord`, `Supplier`, `PurchaseOrder`, `SalesOrder`, `Forecast`, `Notification`.

## C5. Verb-Phrase/Behavior Analysis

1. User logs into the system securely.
2. Administrator assigns role permissions and manages users.
3. Manager adds suppliers and tracks supplier performance history.
4. Manager creates, approves, or rejects POs.
5. Warehouse Staff confirms receipt of POs to increase stock.
6. Warehouse Staff uses voice commands to adjust stock quantities.
7. Sales Personnel logs physical sales and processes customer returns.
8. System processes marketplace webhooks for digital sales.
9. System deducts stock and generates invoices upon order confirmation.
10. System generates demand forecasts and recommends reorder points.
11. System triggers multimodal audio/SMS/e-mail notifications for low stock or shipping delays.

## C6. Relationships Identified

1. `Administrator`, `Manager`, `WarehouseStaff`, and `SalesPersonnel` are specialized user types derived from `User`.
2. A Product/SKU can have multiple Stock Records across warehouses/store locations.
3. A Product/SKU can have multiple Forecast records for locations or time periods.
4. A Supplier fulfils zero or more Purchase Orders.
5. A Purchase Order contains one or more Product line items.
6. A Sales Order contains one or more Product line items.
7. A User may receive zero or more Notifications.
8. A Manager approves zero or more Purchase Orders.
9. Warehouse Staff receives/confirms zero or more Purchase Orders.

## C7. Class Attributes and Methods

The following declarations transcribe the class-code snippets included in the class-diagram report. They are skeletal examples: method bodies are empty, and the code uses basic Java types and generic `List` declarations.

### C7.1 `User`

```java
public class User {
    private String user_id;
    private String name;
    private String email;
    private String role;
    private String hashed_password;
    private String status;

    public void login() {}
    public void logout() {}
    public void reset_password() {}
}
```

Attributes: `user_id`, `name`, `email`, `role`, `hashed_password`, `status`. Methods: `login()`, `logout()`, `reset_password()`.

### C7.2 `Administrator`

```java
public class Administrator extends User {
    public void assign_role() {}
    public void deactivate_supplier() {}
}
```

Inherits from `User`. Methods: `assign_role()`, `deactivate_supplier()`.

### C7.3 `Manager`

```java
public class Manager extends User {
    public void approve_po() {}
    public void reject_po() {}
}
```

Inherits from `User`. Methods: `approve_po()`, `reject_po()`.

### C7.4 `WarehouseStaff`

```java
public class WarehouseStaff extends User {
    public void receive_po_confirm() {}
    public void capture_voice_command() {}
}
```

Inherits from `User`. Methods: `receive_po_confirm()`, `capture_voice_command()`.

### C7.5 `SalesPersonnel`

```java
public class SalesPersonnel extends User {
    public void log_physical_sale() {}
}
```

Inherits from `User`. Method: `log_physical_sale()`.

### C7.6 `Product`

```java
public class Product {
    private String sku_id;
    private String name;
    private String category;
    private double unit_price;
    private int reorder_point;
    private String unit_of_measure;

    public void create() {}
    public void update() {}
    public void delete() {}
    public void search() {}
}
```

Attributes: `sku_id`, `name`, `category`, `unit_price`, `reorder_point`, `unit_of_measure`. Methods: `create()`, `update()`, `delete()`, `search()`.

### C7.7 `StockRecord`

```java
public class StockRecord {
    private String sku_id;
    private String location_id;
    private int quantity_on_hand;
    private int quantity_reserved;
    private Date last_updated;

    public void update_stock() {}
    public void deduct_stock() {}
    public void realtime_sync() {}
}
```

Attributes: SKU and location IDs, on-hand/reserved quantities, and last-updated timestamp. Methods: `update_stock()`, `deduct_stock()`, `realtime_sync()`.

### C7.8 `Forecast`

```java
public class Forecast {
    private String sku_id;
    private String location_id;
    private String forecast_period;
    private int predicted_demand;
    private int recommended_reorder_qty;

    public void generate_demand() {}
    public void detect_seasonality() {}
    public void recommend_reorder() {}
}
```

Attributes: `sku_id`, `location_id`, `forecast_period`, `predicted_demand`, `recommended_reorder_qty`. Methods: `generate_demand()`, `detect_seasonality()`, `recommend_reorder()`.

### C7.9 `Supplier`

```java
public class Supplier {
    private String supplier_id;
    private String name;
    private String contact_details;
    private double rating;
    private int lead_time;
    private String procurement_history;

    public void create() {}
    public void edit() {}
    public void track_performance() {}
    public void search() {}
}
```

Attributes: supplier ID, name, contact details, rating, lead time, procurement history. Methods: `create()`, `edit()`, `track_performance()`, `search()`.

### C7.10 `PurchaseOrder`

```java
public class PurchaseOrder {
    private String po_id;
    private String supplier_id;
    private List line_items;
    private String status;
    private Date order_date;
    private Date expected_date;

    public void create() {}
    public void approve() {}
    public void reject() {}
    public void receive_confirm() {}
    public void flag_overdue() {}
}
```

Attributes: PO ID, supplier ID, line items, status, order date, expected date. Methods: `create()`, `approve()`, `reject()`, `receive_confirm()`, `flag_overdue()`.

### C7.11 `SalesOrder`

```java
public class SalesOrder {
    private String order_id;
    private String channel;
    private String customer_info;
    private List line_items;
    private String status;
    private String payment_reference;

    public void create_order() {}
    public void process_webhook() {}
    public void process_return() {}
    public void generate_invoice() {}
}
```

Attributes: order ID, channel, customer info, line items, status, payment reference. Methods: `create_order()`, `process_webhook()`, `process_return()`, `generate_invoice()`.

### C7.12 `Notification`

```java
public class Notification {
    private String notification_id;
    private String type;
    private String channel;
    private List recipients;
    private String message;
    private Date timestamp;
    private String status;

    public void trigger_low_stock() {}
    public void trigger_shipping_delay() {}
    public void send_audio_alert() {}
}
```

Attributes: notification ID, type, channel, recipients, message, timestamp, status. Methods: `trigger_low_stock()`, `trigger_shipping_delay()`, `send_audio_alert()`.

## C8. Class Diagram Relationships Visible in the Figure

The visual class diagram shows `User` as the parent type, with Administrator, Manager, WarehouseStaff, and SalesPersonnel generalizing from it. `Product` connects to `StockRecord` for inventory tracking and to `Forecast` for analysis. PurchaseOrder connects to Supplier and Products; SalesOrder contains Product line items. Manager and WarehouseStaff participate in PO approval/receipt, and User receives Notifications. Multiplicities/role labels are shown on the diagram but are not all legible enough to transcribe reliably, so the nine relationship statements in Section C6 are the authoritative readable list from the report.

## C9. Conclusion in the Class-Diagram Report

The experiment identifies major classes, attributes, methods, relationships, and inheritance; connects products, stock records, forecasts, suppliers, purchase orders, sales orders, and notifications; and maps classes/operations into object-oriented class declarations.

---

# 5. Document D — Sequence and Collaboration/Communication Diagrams

**Document title:** SE Experiment 4  
**Batch:** A3 / AC  
**Team:** Stavan Desai (`2024300042`), Dev Gaglani (`2024300057`)

## D1. Aim

Model the dynamic behavior of ISMS with UML Sequence and Collaboration (Communication) Diagrams for important use cases. The diagrams are intended to derive actors, objects, relationships, and operations from the class diagram and functional requirements in the SRS.

## D2. Theory: Sequence Diagram

A Sequence Diagram is a UML behavioral diagram showing how actors and objects interact to complete a use case. Messages are ordered in time from top to bottom.

Major elements:

- **Actor:** External user/entity interacting with the system.
- **Lifeline:** Object or participant involved in an interaction.
- **Message:** Request, method call, or communication between participants.
- **Activation:** Period during which an object is executing an operation.
- **Return message:** Response after execution.
- **Guard condition:** Condition that determines whether an interaction occurs.
- **Combined fragments:** Conditional/repetitive interaction blocks, including `alt` (alternative flows such as success/failure or approve/reject), `opt` (optional flow), and `loop` (repeated execution).

The SRS stimulus/response requirements include physical sales logging, PO processing, authentication, stock changes, and alert generation. For example, recording a physical sale deducts the sold quantity from stock and generates an invoice.

Sequence-diagram messages should correspond to methods in classes. Classes cited as the basis include `User`, `Product`, `StockRecord`, `PurchaseOrder`, `SalesOrder`, `Forecast`, and `Notification`.

## D3. Theory: Collaboration/Communication Diagram

A Collaboration Diagram, also called a Communication Diagram, emphasizes structural links and message exchange between objects more than a vertical timeline.

Its elements include:

- Objects/participants in the use case.
- Links that show communication relationships.
- Numbered messages that show operation order.
- Conditions or iterations where necessary.

A sequence diagram answers **when** interactions happen; a collaboration/communication diagram emphasizes **which objects communicate** and the messages they exchange. Both are intended to express the same behavior from different perspectives.

## D4. Role of UML Fragments

The report calls out these non-linear ISMS scenarios:

- A PO may be approved or rejected.
- A PO may be fully or partially received.
- A sale may complete normally or be followed by a return/cancellation.
- Login may succeed or fail.
- A voice command may be accepted or fall back to standard UI when confidence is low.

The SRS's stated PO lifecycle sends a rejected PO from `Pending Approval` back to `Draft`, and a partial shipment to `Partially Received`.

## D5. Problem Description and Selected Scenarios

ISMS replaces fragmented manual processes such as spreadsheets, paper stock registers, and disconnected marketplace dashboards with one web platform for inventory, suppliers, POs, and sales. Its interactions involve authentication, stock management, PO processing, sales tracking, forecasting, notifications, and integrations with marketplaces, STT/TTS, ML forecasting, payment/invoicing, and e-mail/SMS services.

The problem-description section names three representative scenarios as **Physical Sales Processing**, **Purchase Order Management**, and **Authentication**. The implementation section and diagram pages instead describe/show **Inventory Management**, **Manage Purchase Order**, and **Process Sales**. This mismatch is retained in the source-issues section at the end of this file.

## D6. Implementation Scenario 1 — Inventory Management

**Primary actor:** Warehouse Staff.  
**Participants visible in the sequence diagram:** Warehouse Staff actor, `:WarehouseStaff`, `:Product`, `:StockRecord`, `:Notification`.

Narrative of the shown interaction:

1. Warehouse Staff calls `search()` on Product; product details are returned.
2. Warehouse Staff invokes `create()`; system returns “Product created”.
3. An inventory update invokes `update()` on Product; “Product updated” is returned.
4. A deletion operation invokes `delete()`; “Product deleted” is returned.
5. A `loop` fragment repeats voice-command capture until a command is captured, using `capture_voice_command()`.
6. A stock change invokes `update_stock()` on StockRecord and returns “Stock updated”.
7. StockRecord performs `realtime_sync()` and returns “Inventory synchronized”.
8. An `alt` fragment checks the reorder condition. If stock is below the reorder point, `trigger_low_stock()` is invoked on Notification and `send_audio_alert()` generates a low-stock alert. If stock is at or above the reorder point, no low-stock alert is required.

The report's implementation text also states that Inventory Management supports creating, updating, deleting, and searching products/stock records, real-time synchronization, and alternative handling for a low-confidence voice command that requires another input method. The DFD and SRS specify the standard UI fallback explicitly.

## D7. Implementation Scenario 2 — Manage Purchase Order

**Actors/participants visible:** Manager, Warehouse Staff, `:Supplier`, `:Product`, `:PurchaseOrder`, `:WarehouseStaff`.

Narrative of the shown interaction:

1. Manager searches the Supplier and receives supplier details.
2. Manager searches Product and receives product details.
3. Manager calls `create()` on PurchaseOrder; the PO is created.
4. An `alt` fragment represents approval/rejection:
   - **Approved branch:** Manager performs `approve_po()` and confirms approval; the PO's `approve()` operation is executed and PO approval is returned.
   - Warehouse Staff receives the delivery; a receipt confirmation is sent, `receive_confirm()` is invoked on PurchaseOrder, and receipt is confirmed.
   - Supplier's `track_performance()` is invoked and performance is tracked.
   - **Rejected branch:** Manager performs `reject_po()`; `reject()` is invoked on PurchaseOrder and “PO rejected” is returned.
5. An optional `opt` fragment covers an overdue PO; `flag_overdue()` marks it as overdue.

The SRS-derived description says the Manager specifies supplier, products, quantities, and expected delivery date, and that approval must obey configured limits before transmission to the supplier. Partial receipt can leave the PO `Partially Received`, and complete receipt makes it `Received`.

## D8. Implementation Scenario 3 — Process Sales

**Actors/participants visible:** Sales Personnel actor, `:SalesPersonnel`, `:Product`, `:SalesOrder`.

Narrative of the shown interaction:

1. Sales Personnel calls `log_physical_sale()`; the physical sale is logged.
2. Product `search()` returns product details.
3. Sales Personnel calls `create_order()` on SalesOrder; the sales order is created.
4. An `alt` fragment distinguishes a processable order from one that cannot be processed:
   - **Order can be processed:** SalesOrder calls `process_webhook()` (for the digital/webhook interaction represented in the model) and `generate_invoice()`; order and invoice confirmations are returned.
   - **Order cannot be processed:** “Order not processed” is returned.
5. An optional `opt` fragment handles a Customer Return by calling `process_return()` on SalesOrder and returning “Return processed”.

The written implementation also specifies that physical sales may be entered by Sales Personnel and digital orders arrive through marketplace webhooks. The system creates/updates SalesOrder, deducts stock upon confirmation, generates an invoice, and reverses the stock deduction for returns/cancellations. If the requested quantity is unavailable, the order line is rejected and the responsible Manager is notified.

## D9. Diagram Consistency and Conclusion

The report intends to keep each actor, class, and operation consistent with the class diagram. Sequence diagrams show chronological message order; collaboration diagrams are described as numbered messages between linked objects. `alt`, `opt`, loops, and guard conditions represent conditional/optional behavior from the SRS.

**Figure audit note:** The rendered diagram pages in the supplied PDF visibly contain the three sequence diagrams described above. The text discusses collaboration/communication diagrams, but separate communication-diagram figures are not clearly present in the supplied rendered pages.

---

# 6. Document E — UML Activity Diagram

**Document title:** SE Experiment 5 — Inventory and Stock Management System  
**Batch noted:** A/A3; the report also says Division A, Batch C  
**Team:** Dev Gaglani (`2024300057`), Stavan Desai (`2024300042`)

## E1. Aim

Draw a UML Activity Diagram for ISMS to represent inventory, sales, purchasing, stock monitoring, user management, and external-service interactions.

## E2. Theory

An Activity Diagram is a UML behavioral diagram that depicts the flow of activities and control in a system. It can show action sequences, decisions, alternate paths, parallel activities, and process termination.

A swimlane Activity Diagram separates responsibilities by actor or system component. Standard UML elements described in the report include:

- Initial node: start of workflow.
- Activity/action nodes: operations performed.
- Decision nodes: conditions and branches.
- Control-flow arrows: sequence of actions.
- Fork/join nodes: parallel operations.
- Final node: workflow completion.

**Editorial note:** The theory paragraph in the source contains an unrelated example naming an “HRMS activity diagram” and hotel-related lanes (Guest, HRMS, Payment Gateway, OTA/Channel Manager, AI Concierge Service, Notification Service, Smart Lock Controller, Receptionist, Hotel Manager, Finance Staff, System Administrator). Those examples do not belong to the ISMS-specific problem description and implementation below.

## E3. Problem Description and Swimlanes

The ISMS activity diagram separates the workflow into six swimlanes:

1. Administrator
2. Manager
3. Sales Personnel
4. Warehouse Staff
5. ISMS (System)
6. External Services

The workflow covers authentication, user role identification, sales orders, inventory operations, POs, stock monitoring, analytics updates, and low-stock alert generation. External interactions include payment processing, marketplace order synchronization, notifications, voice processing, and demand forecasting.

## E4. Diagram Workflow (Transcribed from the Activity Diagram and Implementation Text)

### Authentication and dashboard

1. ISMS validates login credentials.
2. If credentials are invalid, an error message is shown and the flow returns to credential validation.
3. If credentials are valid, ISMS identifies the user's role and displays the role-based dashboard.

### Administrator activities

- Manage users/roles.
- Manage suppliers.
- Approve purchase orders.
- Configure system settings.

### Manager activities

- View dashboard.
- Generate forecast report.
- Review reorder suggestions.
- Create purchase order.
- Approve or reject purchase orders.

### Sales Personnel activities

1. Create sales order.
2. Scan/select product.
3. Check stock availability.
4. If stock is unavailable, show an out-of-stock message.
5. If stock is available, process payment, generate invoice, and update sales order.

### Warehouse Staff activities

1. Select an inventory operation.
2. Choose between voice command and standard UI.
3. For voice: speak command → Speech-to-Text processing → interpret command → confirm operation.
4. Update the stock record.

The TTS service is used to play confirmation. Voice processing uses the external Speech-to-Text service.

### System and external-service activities

- Marketplace Webhook Sync Online Orders.
- Payment Gateway processes payment.
- E-mail/SMS Gateway sends notifications.
- Speech-to-Text Service converts audio to text.
- Text-to-Speech Service plays confirmation.
- ML Forecasting Service generates demand forecast.

### Common end-of-operation flow

After relevant activities, the ISMS synchronizes across channels, checks reorder levels, and updates analytics data. If stock is below the reorder point, a low-stock alert is generated; otherwise, no low-stock alert is needed. The workflow ends at a final node.

## E5. Conclusion in the Activity-Diagram Report

The swimlanes identify responsibility for Administrator, Manager, Sales Personnel, Warehouse Staff, ISMS, and external-service operations. Decision points represent conditions such as valid credentials, stock availability, voice interaction selection, and reorder levels. The diagram shows integration of inventory operations with payment, notifications, voice processing, marketplace synchronization, and forecasting services.

---

# 7. Document F — Data Flow Diagrams (DFD)

**Document title:** Inventory and Stock Management System (ISMS) — Data Flow Diagrams  
**Team:** Stavan Desai (`2024300042`), Dev Gaglani (`2024300057`)

## F1. Aim

Model data flowing through ISMS at Level 0 (context), Level 1, and Level 2 using Gane–Sarson notation, derived from the class diagram and activity diagram.

## F2. Gane–Sarson Symbols Used

- **Process:** Rounded rectangle, with process number in the top band; transforms inputs to outputs.
- **Data store:** Open-ended rectangle with an ID (`D1`, `D2`, etc.); the report maps each store to a class in the class diagram.
- **External entity:** Plain rectangle representing an actor or service that sends/receives data.
- **Data flow:** Labelled arrow showing data movement between processes, stores, and external entities.
- Duplicated entities/stores used to avoid crossing lines carry duplicate marks (diagonal corner line on an entity; extra vertical line in a data-store ID compartment).

## F3. DFD Level 0 — Context Diagram

The entire ISMS is Process `0`. The diagram shows it exchanging data with eleven external entities:

1. Administrator
2. Manager
3. Sales Personnel
4. Warehouse Staff
5. Supplier
6. Marketplace Webhook
7. Payment Gateway
8. E-mail/SMS Gateway
9. Speech-to-Text Service
10. Text-to-Speech Service
11. ML Forecasting Service

The context boundary represents the overall system rather than decomposing internal operations.

## F4. DFD Level 1 — Seven Processes

The Level 0 Process 0 is decomposed into seven internal processes corresponding to responsibilities in the activity diagram.

| Process ID | Process name | Origin/behavior noted in the report |
|---|---|---|
| **1.0** | Authenticate User | Validate Login Credentials → Identify User Role → Display Role-Based Dashboard; related class operation: `User.login()`. |
| **2.0** | Manage Users, Suppliers & Settings | Administrator actions: Manage Users/Roles, Manage Suppliers, Configure System Settings. |
| **3.0** | Process Sales Order | Sales Personnel flow from Create Sales Order to Update Sales Order; interacts with Marketplace Webhook and Payment Gateway. |
| **4.0** | Manage Inventory Operations | Warehouse Staff flow from Select Inventory Operation to Update Stock Record; interacts with Speech-to-Text and Text-to-Speech. |
| **5.0** | Forecast Demand | Manager generates forecast reports/reviews reorder suggestions; uses ML Forecasting Service and `Forecast` class. |
| **6.0** | Manage Purchase Orders | Create PO, approve/reject by Manager/Administrator, supplier fulfilment, and `WarehouseStaff.receive_po_confirm()`. |
| **7.0** | Monitor Stock & Notify | Synchronize across channels, check reorder levels, generate low-stock alert; uses E-mail/SMS Gateway and `Notification` class. |

## F5. DFD Level 1 — Data Stores

Each Level 1 data store is mapped to a class from the class diagram.

| Store ID | Data store | Class mapping |
|---|---|---|
| `D1` | User | `User` |
| `D2` | Supplier | `Supplier` |
| `D3` | Product | `Product` |
| `D4` | Stock Record | `StockRecord` |
| `D5` | Sales Order | `SalesOrder` |
| `D6` | Forecast | `Forecast` |
| `D7` | Purchase Order | `PurchaseOrder` |
| `D8` | Notification | `Notification` |

The report states that Level 1 has eight stores, one per class, and seven processes, one per responsibility in the activity diagram.

## F6. DFD Level 2 — Process 3.0: Process Sales Order

The Level 2 process follows the Sales Personnel lane:

1. Create Sales Order.
2. Scan/Select Product.
3. Check Stock Availability.
4. Branch on stock:
   - **No:** Show Out-of-Stock Message.
   - **Yes:** Process Payment.
5. Generate Invoice.
6. Update Sales Order.

Online orders enter at process step `3.1` via Marketplace Webhook. Step `3.6` writes the order to `D5` Sales Order and deducts stock in `D4` Stock Record. The methods cited are `SalesOrder.create_order()` and `StockRecord.deduct_stock()`.

The child process retains the same external data flows as its Level 1 parent, preserving DFD balancing.

## F7. DFD Level 2 — Process 4.0: Manage Inventory Operations

The Level 2 process follows the Warehouse Staff lane:

1. Select Inventory Operation.
2. Decide **Use Voice Command?**
   - **Yes:** Speak Command → Speech-to-Text Processing.
   - **No:** Use Standard UI.
3. Interpret Command.
4. Confirm Operation.
5. Update Stock Record.

Step `4.2` calls the Speech-to-Text service. Step `4.4` plays confirmation through the Text-to-Speech service. Step `4.5` writes the result to `D4` Stock Record. Methods cited are `WarehouseStaff.capture_voice_command()` and `StockRecord.update_stock()`.

The report states that Level 2 keeps the parent process's external flows unchanged, so the DFD levels remain balanced.

## F8. Conclusion in the DFD Report

Level 0 defines the system boundary and eleven external entities. Level 1 separates ISMS into seven processes and eight data stores mapped to classes. Level 2 decomposes sales processing and inventory operations into ordered steps, including stock-availability and voice-command decisions. The report says the levels are balanced and provide a basis for database and module design.

---

# 8. Document G — Work Breakdown Structure and Project Schedule

**Document title:** Inventory and Stock Management System (ISMS) — Work Breakdown Structure and Project Schedule  
**Team:** Stavan Desai (`2024300042`), Dev Gaglani (`2024300057`)

## G1. Aim

Plan ISMS by preparing a Work Breakdown Structure (WBS) and Project Schedule (Gantt chart) with activity list, durations, predecessors, start dates, and finish dates. The plan begins on **28 July 2026** and is based on the seven SRS core features and non-functional requirements.

- **WBS:** Breaks the project into phases and work packages so that every deliverable can be identified, numbered, assigned, and tracked.
- **Project Schedule:** Orders the work packages and identifies durations, predecessors, dates, and total project duration.

## G2. WBS Structure

The WBS defines project `1.0` as the complete ISMS deliverable, divides the project into seven major phases, and contains 34 Level 3 work packages.

### Level 1 — Complete project

- **`1.0` Inventory and Stock Management System** — complete project deliverable.

### Level 2 and Level 3 — Phases and packages

#### `1.1` Project Planning

- `1.1.1` Define Scope
- `1.1.2` Identify Stakeholders
- `1.1.3` Feasibility Study
- `1.1.4` Project Plan (WBS & Schedule)

#### `1.2` Requirements Analysis

- `1.2.1` User Requirements
- `1.2.2` Functional Requirements
- `1.2.3` Non-functional Requirements
- `1.2.4` Identify User Roles
- `1.2.5` SRS Preparation

#### `1.3` System Design

- `1.3.1` System Architecture
- `1.3.2` Database & Class Design
- `1.3.3` DFD & Activity Modelling
- `1.3.4` User Interface Design
- `1.3.5` Integration Interface Design

#### `1.4` System Development

- `1.4.1` Authentication & RBAC
- `1.4.2` Voice-Enabled Inventory & Sync
- `1.4.3` Supplier Management
- `1.4.4` Purchase Order Management
- `1.4.5` Sales Tracking & Order Management
- `1.4.6` Predictive Analytics & AI Forecasting
- `1.4.7` Multimodal Notification System

The seven development packages correspond to SRS Section 4 features.

#### `1.5` Testing

- `1.5.1` Unit Testing
- `1.5.2` Integration Testing
- `1.5.3` System & Performance Testing
- `1.5.4` User Acceptance Testing

#### `1.6` Deployment

- `1.6.1` Server Configuration
- `1.6.2` Database Deployment
- `1.6.3` Application Deployment
- `1.6.4` Voice Device Setup
- `1.6.5` User Training

#### `1.7` Maintenance

- `1.7.1` Bug Fixing
- `1.7.2` Performance Monitoring
- `1.7.3` Security Updates
- `1.7.4` Feature Enhancement

### WBS-to-SRS traceability explicitly stated in the WBS report

| WBS package | Corresponding SRS item |
|---|---|
| `1.4.1` Authentication & RBAC | Feature 4.1 Authentication & Role-Based Access Control — High |
| `1.4.2` Voice-Enabled Inventory & Sync | Feature 4.2 Voice-Enabled Inventory & Omnichannel Sync — High |
| `1.4.3` Supplier Management | Feature 4.3 Supplier Management — Medium |
| `1.4.4` Purchase Order Management | Feature 4.4 Purchase Order Management — High |
| `1.4.5` Sales Tracking & Order Management | Feature 4.5 Sales Tracking & Order Management — High |
| `1.4.6` Predictive Analytics & AI Forecasting | Feature 4.6 Predictive Analytics & AI Forecasting — Medium |
| `1.4.7` Multimodal Notification System | Feature 4.7 Multimodal Notification System — Medium |
| `1.2.3` Non-functional Requirements and `1.5.3` System & Performance Testing | SRS 5.1–5.4: performance (`PE-1` to `PE-4`), security (`SE-1` to `SE-5`), availability, and scalability |
| `1.3.5` Integration Interface Design | SRS 3.3: marketplace webhooks, speech-to-text/text-to-speech, ML forecasting, payment gateway, e-mail/SMS |
| `1.6.4` Voice Device Setup | SRS `OE-3`: Android handhelds/wearables with microphone and speaker |
| `1.6.5` User Training | SRS `UD-2`: role-based onboarding walkthrough |
| `1.7.4` Feature Enhancement | SRS 1.4 and 6: later releases, including more voice languages and marketplaces |

## G3. Project Schedule: Overall Window

The project runs from **28 July 2026 to 25 October 2026**, a total of **90 calendar days** under the schedule's inclusive day-count convention. The Software Engineering course window is **28 July–12 October 2026**, or 77 days. Maintenance begins after the course period.

The schedule's assumptions are:

1. Durations use calendar days. Dependencies are finish-to-start; an activity starts the day after its predecessor finishes.
2. Course work through 5 October consists of the diagrams. Each of six diagrams is given one week: Use Case, Class, Sequence & Collaboration, Activity, Data Flow, and WBS & Scheduling. The remaining four weeks are assigned to the SRS, beginning 28 July.
3. System Design is represented by diagrams `1.3a` through `1.3e`. Project Planning is represented by the WBS/Scheduling deliverable, due 5 October.
4. The final course week allocates development to 6–10 October (5 days), testing to 11 October (1 day), and deployment to 12 October (1 day). Testing and deployment are described as one-day activities undertaken by both team members and cover packages `1.5.1`–`1.5.4` and `1.6.1`–`1.6.5`.
5. The team has two members; no more than two development packages run in parallel. Package `1.4.7` follows `1.4.6`, which is built by the same member.
6. Maintenance begins on 13 October 2026.

## G4. Gantt Chart Activity List — Full Schedule Transcription

| ID | Activity | Duration (days) | Predecessor(s) | Start | Finish |
|---|---|---:|---|---|---|
| `1.0` | Project Start | 0 | — | 28 Jul 2026 | 28 Jul 2026 |
| `1.2` | Requirements Analysis (SRS) | 28 | — | 28 Jul 2026 | 24 Aug 2026 |
| `1.3a` | Use Case Diagram | 7 | `1.2` | 25 Aug 2026 | 31 Aug 2026 |
| `1.3b` | Class Diagram | 7 | `1.3a` | 01 Sep 2026 | 07 Sep 2026 |
| `1.3c` | Sequence & Collaboration Diagram | 7 | `1.3b` | 08 Sep 2026 | 14 Sep 2026 |
| `1.3d` | Activity Diagram | 7 | `1.3c` | 15 Sep 2026 | 21 Sep 2026 |
| `1.3e` | Data Flow Diagram | 7 | `1.3d` | 22 Sep 2026 | 28 Sep 2026 |
| `1.1` | Project Planning (WBS & Scheduling) | 7 | `1.3e` | 29 Sep 2026 | 05 Oct 2026 |
| `1.4.1` | Authentication & RBAC | 1 | `1.1` | 06 Oct 2026 | 06 Oct 2026 |
| `1.4.2` | Voice-Enabled Inventory & Sync | 2 | `1.4.1` | 07 Oct 2026 | 08 Oct 2026 |
| `1.4.3` | Supplier Management | 1 | `1.1` | 06 Oct 2026 | 06 Oct 2026 |
| `1.4.4` | Purchase Order Management | 2 | `1.4.1`, `1.4.3` | 07 Oct 2026 | 08 Oct 2026 |
| `1.4.5` | Sales Tracking & Order Management | 2 | `1.4.2` | 09 Oct 2026 | 10 Oct 2026 |
| `1.4.6` | Predictive Analytics & AI Forecasting | 1 | `1.4.4` | 09 Oct 2026 | 09 Oct 2026 |
| `1.4.7` | Multimodal Notification System | 1 | `1.4.2`, `1.4.4`, `1.4.6` | 10 Oct 2026 | 10 Oct 2026 |
| `1.5` | Testing | 1 | `1.4.5`, `1.4.7` | 11 Oct 2026 | 11 Oct 2026 |
| `1.6` | Deployment | 1 | `1.5` | 12 Oct 2026 | 12 Oct 2026 |
| `1.7.1` | Bug Fixing | 5 | `1.6` | 13 Oct 2026 | 17 Oct 2026 |
| `1.7.2` | Performance Monitoring | 5 | `1.6` | 13 Oct 2026 | 17 Oct 2026 |
| `1.7.3` | Security Updates | 3 | `1.7.1` | 18 Oct 2026 | 20 Oct 2026 |
| `1.7.4` | Feature Enhancement | 5 | `1.7.2`, `1.7.3` | 21 Oct 2026 | 25 Oct 2026 |
| `1.0` | Project Completion | 0 | `1.7.4` | 25 Oct 2026 | 25 Oct 2026 |

### G4.1 Development dependency notes

- Authentication & RBAC (`1.4.1`) and Supplier Management (`1.4.3`) start together on 6 October, each lasting one day. The report notes that all modules are role-restricted, so Authentication comes first.
- Voice-Enabled Inventory & Sync (`1.4.2`) follows Authentication; Purchase Order Management (`1.4.4`) follows Authentication and Supplier Management. Both run 7–8 October and last two days.
- Sales Tracking (`1.4.5`) lasts two days and uses the stock model from `1.4.2` to deduct stock.
- Predictive Analytics (`1.4.6`) follows PO Management.
- Multimodal Notifications (`1.4.7`) depend on low-stock events from `1.4.2`, overdue-PO events from `1.4.4`, and the forecasting package `1.4.6`.
- Every development package lasts one or two days (8–16 hours of work), which the report says keeps each task within the 8/80 rule.

### G4.2 Critical path and slack as stated in the report

The report gives the following critical path with no slack:

`1.2 → 1.3a → 1.3b → 1.3c → 1.3d → 1.3e → 1.1 → 1.4.1 → 1.4.2 → 1.4.5 → 1.5 → 1.6 → 1.7.1 → 1.7.3 → 1.7.4`

It also says the chain `1.4.3 → 1.4.4 → 1.4.6 → 1.4.7` has no slack because the team has only two members. `1.7.2` Performance Monitoring is identified as having three days of slack.

## G5. Conclusion in the WBS/Schedule Report

The WBS defines seven phases and 34 work packages. The seven Section 4 SRS features form the development work packages, while interface, performance, deployment, and documentation requirements are represented in other phases. The schedule provides explicit durations and finish-to-start dependencies, completes planned course work by 12 October 2026, and continues maintenance through 25 October 2026.

---

# 9. Consolidated System Flow and Traceability

This section brings the different source models together without adding requirements that are not present in the supplied PDFs.

## 9.1 End-to-end business flow

1. **Authentication:** User submits credentials. ISMS validates the credentials, applies account-lock/session/audit rules, identifies the role, and shows a role-specific dashboard.
2. **Inventory setup and operation:** Authorized users create/update/search products and stock records. Warehouse Staff can use UI or voice commands. Voice commands are transcribed, parsed, audibly confirmed, and committed only after confirmation.
3. **Omnichannel synchronization:** Stock changes propagate to the physical store, own storefront, and connected marketplaces. The stated target is within five seconds. A race to reserve the last unit is resolved in favor of the first confirmed transaction.
4. **Supplier and procurement:** Manager/Administrator maintains suppliers and performance. Manager creates a PO, selects supplier/SKUs/quantities/delivery date, and submits for approval. An approved PO is sent to supplier; Warehouse Staff records the quantity actually received.
5. **Stock replenishment:** Received quantities increase stock. Partial receipts keep outstanding quantities open. Overdue POs are flagged and can trigger shipping-delay notifications.
6. **Sales:** Sales Personnel records physical orders, or digital orders arrive by marketplace webhook. Webhooks are signature-validated. Stock is checked/reserved/deducted according to order status. Completed sales produce itemized PDF invoices. Returns/cancellations reverse the corresponding stock deduction.
7. **Forecasting:** Historical sales/stock data feeds recurring forecasts. Seasonal patterns and supplier lead time inform predicted demand, reorder points, reorder quantities, and pre-filled PO suggestions.
8. **Notifications:** Low stock, overdue shipments, and other configured events generate e-mail, SMS, and/or audio alerts. The system logs notification type, channel, recipients, and delivery status.
9. **Monitoring and audit:** Dashboards expose revenue by channel/location/time and stock status including low-stock/overstock. Authentication, stock-changing, PO, and sales activities are audit logged.

## 9.2 Model traceability table

| System capability | SRS feature | Use-case model | Class model | Activity/DFD representation |
|---|---|---|---|---|
| Authentication and roles | 4.1 | Actor-specific access and admin role management | `User`, `Administrator`, role subclasses | Credential validation and process `1.0 Authenticate User`; store `D1` |
| Inventory CRUD and voice | 4.2 | Manage Inventory, add/update/adjust/delete/search, voice command | `Product`, `StockRecord`, `WarehouseStaff` | Warehouse Staff lane; process `4.0`; store `D3 Product`, `D4 Stock Record` |
| Supplier profiles and performance | 4.3 | Manage Suppliers | `Supplier` | Administrator lane; process `2.0`; PO workflow and store `D2` |
| Purchase orders and receiving | 4.4 | Manage Purchase Order | `PurchaseOrder`, `Supplier`, `Manager`, `WarehouseStaff` | Manager/Admin/Warehouse lanes; process `6.0`; store `D7` |
| Physical/digital sales and invoices | 4.5 | Process Sales Order and returns/cancellations | `SalesOrder`, `Product`, `SalesPersonnel` | Sales Personnel lane; process `3.0`; store `D5` |
| Demand forecasting | 4.6 | Dashboard, Generate Demand Forecast | `Forecast`, `Product`, `Manager` | Manager lane; process `5.0`; store `D6`; ML service |
| Alerts | 4.7 | Low Stock Alert and Shipping Delay Alert | `Notification`, `User`, `StockRecord`, `PurchaseOrder` | Common end-of-operation flow; process `7.0`; store `D8` |

## 9.3 Shared numerical constraints

| Concern | Stated requirement/value | Source location |
|---|---|---|
| Voice-command response | Up to 3 seconds per command, for at least 100 concurrent Warehouse Staff | SRS `PE-1` |
| Stock synchronization | Within 5 seconds | SRS `PE-2`, `Sync.Channel.Realtime` |
| Marketplace webhook handling | Sales order updated within 10 seconds | SRS `PE-3` |
| Full-catalogue forecasting job | Within 30 minutes | SRS `PE-4` |
| Session inactivity | Log out after 30 minutes | SRS `Auth.Session.Timeout` |
| Failed login lock | Five consecutive failures within 15 minutes | SRS `Auth.Login.Fail` |
| Availability | 99.5% | SRS `Availability-1` |
| Course work window | 28 July–12 October 2026; 77 days | WBS/project schedule |
| Overall project window | 28 July–25 October 2026; 90 days | WBS/project schedule |

---

# 10. Source Inconsistencies, Editorial Issues, and Open Decisions

These are differences or unfinished items present in the source PDFs. They are recorded here to help maintain traceability; the source requirements have not been silently harmonized.

## 10.1 Inconsistencies between documents

1. **Purchase-order rejection state differs.** The SRS says rejection from `Pending Approval` returns the PO to `Draft` with a reason and sends it back to the creator. The use-case document's alternative flow says rejection sets the status to `Cancelled` and notifies the Manager. Confirm which behavior is intended.
2. **Sequence-diagram scenario list differs from its implementation.** The SE Experiment 4 problem-description paragraph names Physical Sales Processing, Purchase Order Management, and Authentication. Its implementation text and visible sequence diagrams cover Inventory Management, Manage Purchase Order, and Process Sales. The conclusion again mentions physical sales, PO management, and authentication. This mismatch is preserved here.
3. **Sale-processing order varies by document.** The SRS says stock is deducted upon order confirmation and, for digital orders, reserves stock before payment confirmation. The Use Case 3 normal flow lists payment, invoice/confirmation, then stock deduction. The sequence diagram focuses on order creation, processability, invoice generation, and optional returns. This difference should be clarified in the implementation design rather than inferred away.
4. **Activity-diagram theory contains unrelated HRMS text.** The theory section names hotel/HRMS swimlanes, while the problem description, implementation, and image correctly refer to ISMS roles and services.
5. **Project-schedule wording about diagrams.** The schedule treats six deliverables as one week each (Use Case, Class, Sequence & Collaboration, Activity, DFD, WBS & Scheduling) and assigns four weeks to the SRS. Its date table uses `1.3a`–`1.3e` for the five design diagrams and `1.1` for WBS/Scheduling. The diagram naming/grouping should use this distinction consistently.
6. **Authentication timing note.** The development schedule puts Authentication (`1.4.1`) and Supplier Management (`1.4.3`) on the same date, while the prose also says Authentication comes first because every module is role-restricted. The table's predecessor links should be treated as the explicit schedule dependencies unless the schedule is revised.

## 10.2 Editorial or formatting issues in the supplied reports

- The class-diagram cover shows Stavan's UID once as `202430042`; the other documents consistently show `2024300042`.
- The Activity Diagram report has slightly inconsistent batch labels: `Batch-A/A3` and `Div A Batch C`.
- The SRS table of contents displays “Revision History — Error! Bookmark not defined.”
- Several SRS references remain template placeholders, including the Vision and Scope document, organization UI/UX guide version, marketplace provider names, and STT/TTS provider name.
- The class snippets are skeletal and have empty method bodies. Types such as `Date` and `List` are shown without imports or generic parameter declarations; they serve as class-model examples, not a complete compiling program.
- The Sequence/Collaboration report explains both diagram types, but the supplied diagram pages visibly show three sequence diagrams; separate collaboration-diagram figures were not clearly identifiable in the rendered pages.

## 10.3 Open design decisions copied from the SRS TBD list

- Final voice-command phrases and supported languages/accents for Release 1.0.
- Exact marketplace integrations in Release 1.0 versus later releases.
- ML forecasting algorithm/library and minimum historical dataset for dependable predictions.
- Approved/certified warehouse microphone/speaker and scanner hardware.
- Data-retention duration for historical sales and stock data used for forecasting.

---

# 11. Conclusions Consolidated from the Reports

## 11.1 SRS conclusion / project intent

ISMS Release 1.0 is intended to provide one web-based platform for inventory, supplier, purchase-order, and sales operations, with role-based security, voice-enabled warehouse interaction, omnichannel synchronization, forecasting, and multimodal alerts. Its performance, security, reliability, availability, scalability, and usability requirements are defined by explicit requirement IDs in the SRS.

## 11.2 Use-case-model conclusion

The use-case diagram identifies the actors, system boundary, operations, and links between common and conditional behavior. The three detailed use cases establish normal flows, exceptions, preconditions, postconditions, and local non-functional constraints for inventory, purchase orders, and sales.

## 11.3 Class-model conclusion

The class model identifies core data entities, class attributes/methods, inheritance from `User`, and relationships among products, stock records, suppliers, POs, sales orders, forecasts, and notifications. The code snippets demonstrate a basic object-oriented mapping of the UML design.

## 11.4 Sequence/communication-model conclusion

The behavioral diagrams show how users and system objects cooperate during inventory operations, PO approval/receipt, sales processing, and return handling. Sequence diagrams communicate message ordering; collaboration/communication diagrams are described as emphasizing the links and numbered message exchange between objects. UML fragments capture alternate and optional flows.

## 11.5 Activity-model conclusion

The swimlane activity diagram clarifies ownership of operations across Administrator, Manager, Sales Personnel, Warehouse Staff, ISMS, and external services. It shows authentication decisions, stock checks, voice interaction, payment/invoice processing, channel synchronization, analytics updates, and low-stock alerts.

## 11.6 DFD conclusion

The DFDs establish the system boundary at Level 0, decompose processing and data stores at Level 1, and detail sales and inventory processes at Level 2. The data stores map to the eight principal classes; the report states that parent/child external flows are balanced.

## 11.7 WBS/schedule conclusion

The WBS contains seven phases and 34 work packages. The schedule starts on 28 July 2026, covers course deliverables through 12 October, and continues maintenance through 25 October. It lists task dependencies, dates, durations, a stated critical path, and three days of slack for Performance Monitoring.

---

**End of consolidated ISMS document.**
