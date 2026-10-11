package com.isms.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class SalesPersonnelService {

    private final ProductService productService;
    private final SalesOrderService salesOrderService;

    public SalesPersonnelService(ProductService productService, SalesOrderService salesOrderService) {
        this.productService = productService;
        this.salesOrderService = salesOrderService;
    }

    public Map<String, Object> logPhysicalSale(String salesPersonId, String locationId, List<Map<String, Object>> lines, String customerInfo) {
        List<Map<String, Object>> mutableLines = new ArrayList<>();
        if (lines != null) {
            for (Map<String, Object> line : lines) {
                Map<String, Object> copy = new HashMap<>(line);
                String skuId = (String) copy.get("sku_id");
                if (skuId == null) skuId = (String) copy.get("skuId");
                if (skuId != null) {
                    productService.search(skuId, null);
                }
                if (!copy.containsKey("location_id") && !copy.containsKey("locationId")) {
                    copy.put("location_id", locationId != null ? locationId : "WH-01");
                }
                mutableLines.add(copy);
            }
        }

        return salesOrderService.createOrder("physical", customerInfo != null ? customerInfo : "Walk-in Customer", mutableLines);
    }
}
