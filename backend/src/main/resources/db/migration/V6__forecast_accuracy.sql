-- V6: Add forecast accuracy tracking table (GAP-04, SRS §A4.6 Forecast.Accuracy.Track)
CREATE TABLE forecast_accuracy (
    accuracy_id      VARCHAR(48)   PRIMARY KEY,
    sku_id           VARCHAR(32)   NOT NULL REFERENCES products(sku_id) ON DELETE CASCADE,
    forecast_period  VARCHAR(16)   NOT NULL,
    predicted_demand INTEGER       NOT NULL,
    actual_demand    INTEGER       NOT NULL DEFAULT 0,
    absolute_error   INTEGER       NOT NULL DEFAULT 0,
    percentage_error NUMERIC(5,2)  NOT NULL DEFAULT 0.00,
    recorded_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ix_forecast_acc_sku ON forecast_accuracy(sku_id, forecast_period);
