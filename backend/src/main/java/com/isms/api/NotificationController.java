package com.isms.api;

import com.isms.domain.NotificationService;
import com.isms.model.Notification;
import com.isms.model.NotificationPreference;
import com.isms.model.User;
import com.isms.repository.NotificationPreferenceRepository;
import com.isms.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    private static final List<String> DEFAULT_TYPES = List.of(
            "Low Stock",
            "Shipping Delay",
            "Order Update",
            "Other Alert"
    );

    public NotificationController(NotificationService notificationService,
                                  NotificationPreferenceRepository preferenceRepository,
                                  UserRepository userRepository) {
        this.notificationService = notificationService;
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
    }

    public record PreferenceItem(
            String notificationType,
            Boolean emailEnabled,
            Boolean audioEnabled,
            Boolean smsEnabled
    ) {}

    public record UpdatePreferencesRequest(List<PreferenceItem> preferences) {}

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications() {
        String userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<Notification> list = notificationService.getNotificationsForUser(userId);
        return ResponseEntity.ok(list);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable("id") String id) {
        Notification updated = notificationService.markAsRead(id);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/preferences")
    public ResponseEntity<List<Map<String, Object>>> getPreferences() {
        String userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        List<NotificationPreference> userPrefs = preferenceRepository.findByUserUserId(userId);
        Map<String, NotificationPreference> map = new HashMap<>();
        for (NotificationPreference p : userPrefs) {
            map.put(p.getNotificationType(), p);
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (String type : DEFAULT_TYPES) {
            NotificationPreference pref = map.get(type);
            Map<String, Object> item = new HashMap<>();
            item.put("notificationType", type);
            item.put("emailEnabled", pref != null ? pref.getEmailEnabled() : true);
            item.put("audioEnabled", pref != null ? pref.getAudioEnabled() : true);
            item.put("smsEnabled", pref != null ? pref.getSmsEnabled() : false);
            response.add(item);
        }

        return ResponseEntity.ok(response);
    }

    @PutMapping("/preferences")
    public ResponseEntity<List<Map<String, Object>>> updatePreferences(@RequestBody UpdatePreferencesRequest request) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (request.preferences() != null) {
            for (PreferenceItem item : request.preferences()) {
                NotificationPreference pref = preferenceRepository
                        .findByUserUserIdAndNotificationType(userId, item.notificationType())
                        .orElseGet(() -> new NotificationPreference(
                                "PREF-" + UUID.randomUUID().toString().substring(0, 8),
                                user,
                                item.notificationType(),
                                true,
                                true,
                                false
                        ));

                if (item.emailEnabled() != null) pref.setEmailEnabled(item.emailEnabled());
                if (item.audioEnabled() != null) pref.setAudioEnabled(item.audioEnabled());
                if (item.smsEnabled() != null) pref.setSmsEnabled(item.smsEnabled());

                preferenceRepository.save(pref);
            }
        }

        return getPreferences();
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return null;
        }
        return auth.getPrincipal().toString();
    }
}
