package com.isms.domain;

/**
 * Published by SalesOrderService for every deducted line item. The forecasting module listens to it to record
 * actual demand (Forecast.Accuracy.Track), so Sales does not depend on Forecast at compile time.
 */
public record SaleRecordedEvent(String skuId, int quantity) {}
