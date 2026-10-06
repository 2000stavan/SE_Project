package com.isms.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NotificationStatus {
    PENDING("Pending"),
    SENT("Sent"),
    FAILED("Failed");

    private final String value;

    NotificationStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static NotificationStatus fromValue(String value) {
        for (NotificationStatus s : values()) {
            if (s.value.equalsIgnoreCase(value) || s.name().equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown notification status: " + value);
    }
}
