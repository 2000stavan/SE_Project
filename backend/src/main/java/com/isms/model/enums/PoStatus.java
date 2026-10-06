package com.isms.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PoStatus {
    DRAFT("Draft"),
    PENDING_APPROVAL("Pending Approval"),
    APPROVED("Approved"),
    PARTIALLY_RECEIVED("Partially Received"),
    RECEIVED("Received"),
    CANCELLED("Cancelled");

    private final String value;

    PoStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static PoStatus fromValue(String value) {
        for (PoStatus s : values()) {
            if (s.value.equalsIgnoreCase(value) || s.name().equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown PO status: " + value);
    }
}
