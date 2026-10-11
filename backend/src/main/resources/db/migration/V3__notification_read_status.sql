-- V3: Add read_at timestamp and support 'Read' status in notifications
ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;

-- Drop previous check constraint and add updated check constraint supporting 'Read'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
    CHECK (status IN ('Pending','Sent','Failed','Read'));
