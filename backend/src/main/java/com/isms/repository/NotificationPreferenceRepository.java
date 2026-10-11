package com.isms.repository;

import com.isms.model.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, String> {
    List<NotificationPreference> findByUserUserId(String userId);
    Optional<NotificationPreference> findByUserUserIdAndNotificationType(String userId, String notificationType);
}
