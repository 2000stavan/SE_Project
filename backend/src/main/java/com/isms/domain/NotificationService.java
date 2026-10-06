package com.isms.domain;

import com.isms.adapter.MailerAdapter;
import com.isms.model.Notification;
import com.isms.model.User;
import com.isms.model.enums.NotificationChannel;
import com.isms.model.enums.NotificationStatus;
import com.isms.model.enums.NotificationType;
import com.isms.repository.NotificationRepository;
import com.isms.repository.UserRepository;
import com.isms.websocket.AlertWebSocketHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final AlertWebSocketHandler alertWebSocketHandler;
    private final MailerAdapter mailerAdapter;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private NotificationService self;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            AlertWebSocketHandler alertWebSocketHandler,
            MailerAdapter mailerAdapter
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.alertWebSocketHandler = alertWebSocketHandler;
        this.mailerAdapter = mailerAdapter;
    }

    public void triggerLowStock(String skuId, String locationId, int qtyOnHand, int reorderPoint) {
        String msg = "Low stock alert: SKU " + skuId + " at " + locationId + " has " + qtyOnHand + " units remaining (reorder point: " + reorderPoint + ")";
        userRepository.findAll().stream()
                .filter(u -> u.getRole().getValue().equals("Warehouse Staff") || u.getRole().getValue().equals("Manager"))
                .forEach(u -> {
                    createNotification(u, NotificationType.LOW_STOCK, NotificationChannel.EMAIL, msg);
                    mailerAdapter.sendEmail(u.getEmail(), "ISMS Low Stock Alert: " + skuId, msg);
                });
        (self != null ? self : this).sendAudioAlert(msg, 0.6);
    }

    public void triggerShippingDelay(String poId, String supplierId) {
        String msg = "Shipping delay alert: Purchase Order " + poId + " from supplier " + supplierId + " is overdue";
        userRepository.findAll().stream()
                .filter(u -> u.getRole().getValue().equals("Manager"))
                .forEach(u -> {
                    createNotification(u, NotificationType.SHIPPING_DELAY, NotificationChannel.EMAIL, msg);
                    mailerAdapter.sendEmail(u.getEmail(), "ISMS Shipping Delay: PO " + poId, msg);
                });
    }

    public void sendAudioAlert(String message, double maxVolume) {
        alertWebSocketHandler.broadcastAudioAlert(message, maxVolume);
    }

    public List<Notification> getNotificationsForUser(String userId) {
        return notificationRepository.findByUserUserIdOrderByTimestampDesc(userId);
    }

    public Notification markAsRead(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification != null) {
            notification.setStatus(NotificationStatus.SENT);
            return notificationRepository.save(notification);
        }
        return null;
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
