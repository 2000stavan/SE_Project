package com.isms.model;

import com.isms.model.enums.NotificationChannel;
import com.isms.model.enums.NotificationStatus;
import com.isms.model.enums.NotificationType;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.Objects;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @Column(name = "notification_id", length = 40, nullable = false)
    private String notificationId;

    @com.fasterxml.jackson.annotation.JsonIgnore // lazy User proxy is not serializable; recipients only ever read their own
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "type", length = 20, nullable = false)
    private NotificationType type;

    @Column(name = "channel", length = 10, nullable = false)
    private NotificationChannel channel;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp = OffsetDateTime.now();

    @Column(name = "status", length = 12, nullable = false)
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    public Notification() {}

    public Notification(String notificationId, User user, NotificationType type, NotificationChannel channel, String message, OffsetDateTime timestamp, NotificationStatus status) {
        this.notificationId = notificationId;
        this.user = user;
        this.type = type;
        this.channel = channel;
        this.message = message;
        this.timestamp = timestamp != null ? timestamp : OffsetDateTime.now();
        this.status = status != null ? status : NotificationStatus.PENDING;
    }

    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public NotificationChannel getChannel() {
        return channel;
    }

    public void setChannel(NotificationChannel channel) {
        this.channel = channel;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public OffsetDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(OffsetDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public NotificationStatus getStatus() {
        return status;
    }

    public void setStatus(NotificationStatus status) {
        this.status = status;
    }

    public OffsetDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(OffsetDateTime readAt) {
        this.readAt = readAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Notification that)) return false;
        return Objects.equals(notificationId, that.notificationId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(notificationId);
    }
}
