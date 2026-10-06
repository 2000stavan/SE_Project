package com.isms.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NotificationChannel {
    EMAIL("E-mail"),
    SMS("SMS"),
    AUDIO("Audio");

    private final String value;

    NotificationChannel(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static NotificationChannel fromValue(String value) {
        for (NotificationChannel c : values()) {
            if (c.value.equalsIgnoreCase(value) || c.name().equalsIgnoreCase(value)) {
                return c;
            }
        }
        throw new IllegalArgumentException("Unknown notification channel: " + value);
    }
}
