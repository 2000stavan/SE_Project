-- V5: Add notification preferences table for user alerts customization (GAP-05, SRS §A4.7)
CREATE TABLE notification_preferences (
    pref_id           VARCHAR(48)  PRIMARY KEY,
    user_id           VARCHAR(32)  NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(32)  NOT NULL,
    email_enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    audio_enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    sms_enabled       BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_user_notif_type UNIQUE (user_id, notification_type)
);

CREATE INDEX ix_notif_pref_user ON notification_preferences(user_id);
