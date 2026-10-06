package com.isms.domain;

import com.isms.model.Notification;
import com.isms.model.User;
import com.isms.model.enums.NotificationChannel;
import com.isms.model.enums.NotificationStatus;
import com.isms.model.enums.NotificationType;
import com.isms.repository.NotificationRepository;
import com.isms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public void triggerLowStock(String skuId, String locationId, int qtyOnHand, int reorderPoint) {
        String msg = "Low stock alert: SKU " + skuId + " at " + locationId + " has " + qtyOnHand + " units remaining (reorder point: " + reorderPoint + ")";
        userRepository.findAll().stream()
                .filter(u -> u.getRole().getValue().equals("Warehouse Staff") || u.getRole().getValue().equals("Manager"))
                .forEach(u -> createNotification(u, NotificationType.LOW_STOCK, NotificationChannel.EMAIL, msg));
        sendAudioAlert(msg, 0.6);
    }

    public void triggerShippingDelay(String poId, String supplierId) {
        String msg = "Shipping delay alert: Purchase Order " + poId + " from supplier " + supplierId + " is overdue";
        userRepository.findAll().stream()
                .filter(u -> u.getRole().getValue().equals("Manager"))
                .forEach(u -> createNotification(u, NotificationType.SHIPPING_DELAY, NotificationChannel.EMAIL, msg));
    }

    public void sendAudioAlert(String message, double maxVolume) {
        // Dispatched over WebSocket / audio channel (P2)
    }

    private void createNotification(User user, NotificationType type, NotificationChannel channel, String message) {
        Notification notification = new Notification(
                "NTF-" + UUID.randomUUID().toString().substring(0, 8),
                user,
                type,
                channel,
                message,
                OffsetDateTime.now(),
                NotificationStatus.SENT
        );
        notificationRepository.save(notification);
    }
}
