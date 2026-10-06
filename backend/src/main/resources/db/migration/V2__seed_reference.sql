-- Reference Seed Data for ISMS
-- Default users across all 4 roles (Password: Password123!)
INSERT INTO users (user_id, name, email, role, hashed_password, status) VALUES
  ('USR-ADMIN-1', 'Alice Admin', 'admin@isms.com', 'Administrator', '$2a$10$cTSIgMHAkgA8RiNb2rnIsOH4ySAN5PwDUbc/GTfYqx7vETI5D/p9m', 'active'),
  ('USR-MGR-1', 'Bob Manager', 'manager1@isms.com', 'Manager', '$2a$10$cTSIgMHAkgA8RiNb2rnIsOH4ySAN5PwDUbc/GTfYqx7vETI5D/p9m', 'active'),
  ('USR-MGR-2', 'Beth Manager', 'manager2@isms.com', 'Manager', '$2a$10$cTSIgMHAkgA8RiNb2rnIsOH4ySAN5PwDUbc/GTfYqx7vETI5D/p9m', 'active'),
  ('USR-WH-1', 'Charlie Warehouse', 'warehouse1@isms.com', 'Warehouse Staff', '$2a$10$cTSIgMHAkgA8RiNb2rnIsOH4ySAN5PwDUbc/GTfYqx7vETI5D/p9m', 'active'),
  ('USR-WH-2', 'Cathy Warehouse', 'warehouse2@isms.com', 'Warehouse Staff', '$2a$10$cTSIgMHAkgA8RiNb2rnIsOH4ySAN5PwDUbc/GTfYqx7vETI5D/p9m', 'active'),
  ('USR-SALES-1', 'Dave Sales', 'sales1@isms.com', 'Sales Personnel', '$2a$10$cTSIgMHAkgA8RiNb2rnIsOH4ySAN5PwDUbc/GTfYqx7vETI5D/p9m', 'active')
ON CONFLICT (user_id) DO NOTHING;
