package com.isms.model.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public class JpaConverters {

    @Converter(autoApply = true)
    public static class RoleConverter implements AttributeConverter<Role, String> {
        @Override
        public String convertToDatabaseColumn(Role attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public Role convertToEntityAttribute(String dbData) {
            return dbData != null ? Role.fromValue(dbData) : null;
        }
    }

    @Converter(autoApply = true)
    public static class UserStatusConverter implements AttributeConverter<UserStatus, String> {
        @Override
        public String convertToDatabaseColumn(UserStatus attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public UserStatus convertToEntityAttribute(String dbData) {
            return dbData != null ? UserStatus.fromValue(dbData) : null;
        }
    }

    @Converter(autoApply = true)
    public static class PoStatusConverter implements AttributeConverter<PoStatus, String> {
        @Override
        public String convertToDatabaseColumn(PoStatus attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public PoStatus convertToEntityAttribute(String dbData) {
            return dbData != null ? PoStatus.fromValue(dbData) : null;
        }
    }

    @Converter(autoApply = true)
    public static class SalesStatusConverter implements AttributeConverter<SalesStatus, String> {
        @Override
        public String convertToDatabaseColumn(SalesStatus attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public SalesStatus convertToEntityAttribute(String dbData) {
            return dbData != null ? SalesStatus.fromValue(dbData) : null;
        }
    }

    @Converter(autoApply = true)
    public static class NotificationTypeConverter implements AttributeConverter<NotificationType, String> {
        @Override
        public String convertToDatabaseColumn(NotificationType attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public NotificationType convertToEntityAttribute(String dbData) {
            return dbData != null ? NotificationType.fromValue(dbData) : null;
        }
    }

    @Converter(autoApply = true)
    public static class NotificationChannelConverter implements AttributeConverter<NotificationChannel, String> {
        @Override
        public String convertToDatabaseColumn(NotificationChannel attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public NotificationChannel convertToEntityAttribute(String dbData) {
            return dbData != null ? NotificationChannel.fromValue(dbData) : null;
        }
    }

    @Converter(autoApply = true)
    public static class NotificationStatusConverter implements AttributeConverter<NotificationStatus, String> {
        @Override
        public String convertToDatabaseColumn(NotificationStatus attribute) {
            return attribute != null ? attribute.getValue() : null;
        }

        @Override
        public NotificationStatus convertToEntityAttribute(String dbData) {
            return dbData != null ? NotificationStatus.fromValue(dbData) : null;
        }
    }
}
