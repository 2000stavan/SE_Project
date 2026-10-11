-- V4: Add line_number to sales_order_line_items to prevent PK collisions when same SKU is ordered multiple times
ALTER TABLE sales_order_line_items ADD COLUMN line_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE sales_order_line_items DROP CONSTRAINT IF EXISTS sales_order_line_items_pkey;
ALTER TABLE sales_order_line_items ADD CONSTRAINT sales_order_line_items_pkey PRIMARY KEY (order_id, sku_id, line_number);
