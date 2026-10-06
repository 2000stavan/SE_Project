package com.isms.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class WarehouseStaffService {

    private final PurchaseOrderService purchaseOrderService;

    public WarehouseStaffService(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    public Map<String, Object> captureVoiceCommand(String transcript, double confidence, String deviceId) {
        // Voice parsing logic will be fully wired in Phase P2
        return Map.of("transcript", transcript, "confidence", confidence, "deviceId", deviceId);
    }

    public void receivePoConfirm(String poId, String staffId, List<Map<String, Object>> lines) {
        purchaseOrderService.receiveConfirm(poId, staffId, lines);
    }
}
