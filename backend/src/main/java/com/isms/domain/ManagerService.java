package com.isms.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ManagerService {

    private final PurchaseOrderService purchaseOrderService;

    public ManagerService(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    public void approvePo(String poId, String managerId) {
        purchaseOrderService.approve(poId, managerId);
    }

    public void rejectPo(String poId, String managerId, String reason) {
        purchaseOrderService.reject(poId, managerId, reason);
    }
}
