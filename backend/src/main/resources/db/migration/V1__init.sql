-- D1 User  (class: User; subclasses = role values)
CREATE TABLE users (
  user_id          VARCHAR(32)  PRIMARY KEY,
  name             VARCHAR(120) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  role             VARCHAR(20)  NOT NULL
                   CHECK (role IN ('Administrator','Manager','Warehouse Staff','Sales Personnel')),
  hashed_password  VARCHAR(255) NOT NULL,          -- BCrypt hash
  status           VARCHAR(10)  NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','locked'))
);

-- D2 Supplier
CREATE TABLE suppliers (
  supplier_id          VARCHAR(32)  PRIMARY KEY,
  name                 VARCHAR(160) NOT NULL,
  contact_details      TEXT         NOT NULL,        -- phone/email/address block
  rating               NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  lead_time            INTEGER      NOT NULL DEFAULT 0 CHECK (lead_time >= 0),  -- days
  procurement_history  TEXT         NOT NULL DEFAULT '',
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE      -- DEVIATION D-1
);

-- D3 Product
CREATE TABLE products (
  sku_id           VARCHAR(32)   PRIMARY KEY,
  name             VARCHAR(160)  NOT NULL,
  category         VARCHAR(80)   NOT NULL,
  unit_price       NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  reorder_point    INTEGER       NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  unit_of_measure  VARCHAR(20)   NOT NULL
);
CREATE INDEX ix_products_category ON products(category);

-- D4 StockRecord   (Product 1 —tracked— 1..* StockRecord)
CREATE TABLE stock_records (
  sku_id             VARCHAR(32) NOT NULL REFERENCES products(sku_id) ON DELETE RESTRICT,
  location_id        VARCHAR(32) NOT NULL,
  quantity_on_hand   INTEGER     NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),   -- BR-3
  quantity_reserved  INTEGER     NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  last_updated       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sku_id, location_id),
  CHECK (quantity_reserved <= quantity_on_hand)
);

-- D6 Forecast      (Product 1 —analyzed— 0..* Forecast)
CREATE TABLE forecasts (
  sku_id                    VARCHAR(32) NOT NULL REFERENCES products(sku_id) ON DELETE CASCADE,
  location_id               VARCHAR(32) NOT NULL,
  forecast_period           VARCHAR(16) NOT NULL,   -- e.g. '2026-11' or '2026-W45'
  predicted_demand          INTEGER     NOT NULL CHECK (predicted_demand >= 0),
  recommended_reorder_qty   INTEGER     NOT NULL CHECK (recommended_reorder_qty >= 0),
  PRIMARY KEY (sku_id, location_id, forecast_period)
);

-- D7 PurchaseOrder (Supplier 1 —fulfills— 0..* PO; Manager 1 —approves— 0..* PO; WarehouseStaff 1 —receives— 0..* PO)
CREATE TABLE purchase_orders (
  po_id               VARCHAR(32) PRIMARY KEY,
  supplier_id         VARCHAR(32) NOT NULL REFERENCES suppliers(supplier_id),
  status              VARCHAR(20) NOT NULL DEFAULT 'Draft'
                      CHECK (status IN ('Draft','Pending Approval','Approved',
                                        'Partially Received','Received','Cancelled')),
  order_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_date       DATE        NOT NULL,
  manager_id          VARCHAR(32) REFERENCES users(user_id),   -- "approves" association (owning Manager)
  warehouse_staff_id  VARCHAR(32) REFERENCES users(user_id)    -- "receives" association (last receiver)
);
CREATE INDEX ix_po_status ON purchase_orders(status);

CREATE TABLE po_line_items (
  po_id              VARCHAR(32) NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  sku_id             VARCHAR(32) NOT NULL REFERENCES products(sku_id),
  quantity_ordered   INTEGER     NOT NULL CHECK (quantity_ordered > 0),
  quantity_received  INTEGER     NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  last_received_at   TIMESTAMPTZ,                -- used for on-time-rate (Supplier.track_performance)
  PRIMARY KEY (po_id, sku_id),
  CHECK (quantity_received <= quantity_ordered)
);

-- D5 SalesOrder
CREATE TABLE sales_orders (
  order_id           VARCHAR(48)  PRIMARY KEY,         -- marketplace order id is reused => webhook idempotency
  channel            VARCHAR(40)  NOT NULL,            -- 'physical' | 'storefront' | 'marketplace:<name>'
  customer_info      TEXT         NOT NULL DEFAULT '',
  status             VARCHAR(12)  NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Pending','Confirmed','Completed','Cancelled','Returned','Rejected')),
  payment_reference  VARCHAR(80),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()    -- DEVIATION D-2
);
CREATE INDEX ix_sales_channel_date ON sales_orders(channel, created_at);

CREATE TABLE sales_order_line_items (
  order_id    VARCHAR(48)   NOT NULL REFERENCES sales_orders(order_id) ON DELETE CASCADE,
  sku_id      VARCHAR(32)   NOT NULL REFERENCES products(sku_id),
  location_id VARCHAR(32)   NOT NULL,
  quantity    INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL,                 -- price snapshot for invoice
  PRIMARY KEY (order_id, sku_id)
);

-- D8 Notification  (User 1 —receives— 0..* Notification; one row per recipient+channel)
CREATE TABLE notifications (
  notification_id  VARCHAR(40)  PRIMARY KEY,
  user_id          VARCHAR(32)  NOT NULL REFERENCES users(user_id),
  type             VARCHAR(20)  NOT NULL
                   CHECK (type IN ('Low Stock','Shipping Delay','Order Update','Other Alert')),
  channel          VARCHAR(10)  NOT NULL CHECK (channel IN ('E-mail','SMS','Audio')),
  message          TEXT         NOT NULL,
  timestamp        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  status           VARCHAR(12)  NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending','Sent','Failed'))
);
CREATE INDEX ix_notif_user ON notifications(user_id, timestamp DESC);
