package com.isms.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NotificationType {
    LOW_STOCK("Low Stock"),
    SHIPPING_DELAY("Shipping Delay"),
    ORDER_UPDATE("Order Update"),
    OTHER_ALERT("Other Alert");

    private final String value;

    NotificationType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static NotificationType fromValue(String value) {
        for (NotificationType t : values()) {
            if (t.value.equalsIgnoreCase(value) || t.name().equalsIgnoreCase(value)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unknown notification type: " + value);
    }
}
