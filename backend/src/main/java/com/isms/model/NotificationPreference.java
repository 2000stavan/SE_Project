package com.isms.model;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "notification_preferences", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_notif_type", columnNames = {"user_id", "notification_type"})
})
public class NotificationPreference {

    @Id
    @Column(name = "pref_id", length = 48, nullable = false)
    private String prefId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "notification_type", length = 32, nullable = false)
    private String notificationType;

    @Column(name = "email_enabled", nullable = false)
    private Boolean emailEnabled = true;

    @Column(name = "audio_enabled", nullable = false)
    private Boolean audioEnabled = true;

    @Column(name = "sms_enabled", nullable = false)
    private Boolean smsEnabled = false;

    public NotificationPreference() {}

    public NotificationPreference(String prefId, User user, String notificationType, Boolean emailEnabled, Boolean audioEnabled, Boolean smsEnabled) {
        this.prefId = prefId;
        this.user = user;
        this.notificationType = notificationType;
        this.emailEnabled = emailEnabled != null ? emailEnabled : true;
        this.audioEnabled = audioEnabled != null ? audioEnabled : true;
        this.smsEnabled = smsEnabled != null ? smsEnabled : false;
    }

    public String getPrefId() {
        return prefId;
    }

    public void setPrefId(String prefId) {
        this.prefId = prefId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public Boolean getEmailEnabled() {
        return emailEnabled;
    }

    public void setEmailEnabled(Boolean emailEnabled) {
        this.emailEnabled = emailEnabled;
    }

    public Boolean getAudioEnabled() {
        return audioEnabled;
    }

    public void setAudioEnabled(Boolean audioEnabled) {
        this.audioEnabled = audioEnabled;
    }

    public Boolean getSmsEnabled() {
        return smsEnabled;
    }

    public void setSmsEnabled(Boolean smsEnabled) {
        this.smsEnabled = smsEnabled;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NotificationPreference that)) return false;
        return Objects.equals(prefId, that.prefId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(prefId);
    }
}
