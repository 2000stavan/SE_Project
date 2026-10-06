package com.isms.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum UserStatus {
    ACTIVE("active"),
    INACTIVE("inactive"),
    LOCKED("locked");

    private final String value;

    UserStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static UserStatus fromValue(String value) {
        for (UserStatus s : values()) {
            if (s.value.equalsIgnoreCase(value) || s.name().equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown user status: " + value);
    }
}
