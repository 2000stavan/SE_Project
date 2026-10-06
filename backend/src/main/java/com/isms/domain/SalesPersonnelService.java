package com.isms.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class SalesPersonnelService {

    private final SalesOrderService salesOrderService;

    public SalesPersonnelService(SalesOrderService salesOrderService) {
        this.salesOrderService = salesOrderService;
    }

    public Map<String, Object> logPhysicalSale(String salesPersonId, String locationId, List<Map<String, Object>> lines, String customerInfo) {
        return salesOrderService.createOrder("physical", customerInfo, lines);
    }
}
