package com.isms.domain;

import com.isms.adapter.ChannelAdapter;
import com.isms.audit.AuditLogger;
import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.model.StockRecord;
import com.isms.model.StockRecordId;
import com.isms.repository.ProductRepository;
import com.isms.repository.StockRecordRepository;
import com.isms.websocket.StockWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class StockRecordService {

    private static final Logger log = LoggerFactory.getLogger(StockRecordService.class);

    private final StockRecordRepository stockRecordRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;
    private final StockWebSocketHandler stockWebSocketHandler;
    private final List<ChannelAdapter> channelAdapters;
    private final AuditLogger auditLogger;

    @org.springframework.context.annotation.Lazy
    @org.springframework.beans.factory.annotation.Autowired
    private StockRecordService self;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager em;

    public StockRecordService(
            StockRecordRepository stockRecordRepository,
            ProductRepository productRepository,
            NotificationService notificationService,
            StockWebSocketHandler stockWebSocketHandler,
            List<ChannelAdapter> channelAdapters,
            AuditLogger auditLogger
    ) {
        this.stockRecordRepository = stockRecordRepository;
        this.productRepository = productRepository;
        this.notificationService = notificationService;
        this.stockWebSocketHandler = stockWebSocketHandler;
        this.channelAdapters = channelAdapters;
        this.auditLogger = auditLogger;
    }

    public StockRecord updateStock(String skuId, String locationId, int quantityOnHand) {
        if (quantityOnHand < 0) {
            throw new com.isms.error.InsufficientStockException("Quantity on hand cannot be negative (BR-3)");
        }

        Product product = productRepository.findById(skuId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + skuId));

        StockRecord stock = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(skuId, locationId)
                .orElseGet(() -> {
                    StockRecord newStock = new StockRecord(
                            new StockRecordId(skuId, locationId),
                            product,
                            0,
                            0,
                            OffsetDateTime.now()
                    );
                    return stockRecordRepository.save(newStock);
                });

        stock.setQuantityOnHand(quantityOnHand);
        stock.setLastUpdated(OffsetDateTime.now());
        StockRecord saved = stockRecordRepository.save(stock);

        auditLogger.log("system", "STOCK_UPDATED", "stock_records", Map.of(
                "sku_id", skuId,
                "location_id", locationId,
                "quantity_on_hand", quantityOnHand
        ));

        // Realtime sync to WebSockets & Channel adapters
        (self != null ? self : this).realtimeSync(skuId, locationId, saved.getQuantityOnHand(), saved.getQuantityReserved());

        // Sequence 1 alt: low-stock check
        if (saved.getQuantityOnHand() < product.getReorderPoint()) {
            notificationService.triggerLowStock(skuId, locationId, saved.getQuantityOnHand(), product.getReorderPoint());
        } else {
            log.info("[STOCK] No alert required for SKU {} (qty={} >= reorder={})",
                    skuId, saved.getQuantityOnHand(), product.getReorderPoint());
        }

        return saved;
    }

    public StockRecord deductStock(String skuId, String locationId, int delta) {
        if (delta <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DELTA", "Deduct delta must be greater than zero");
        }

        Product product = productRepository.findById(skuId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found: " + skuId));

        StockRecord stock = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(skuId, locationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "STOCK_NOT_FOUND", "Stock record not found"));
        // If this transaction already loaded the row (e.g. the availability pre-check in SalesOrderService), Hibernate
        // returns the cached, possibly stale entity even though the row is now locked. Reload the committed state, otherwise
        // two concurrent sales of the last unit both pass the BR-3 check (lost update).
        em.refresh(stock);

        if (stock.getQuantityOnHand() - delta < 0) {
            throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Insufficient stock on hand to deduct (BR-3)");
        }

        stock.setQuantityOnHand(stock.getQuantityOnHand() - delta);
        stock.setLastUpdated(OffsetDateTime.now());
        StockRecord saved = stockRecordRepository.save(stock);

        auditLogger.log("system", "STOCK_DEDUCTED", "stock_records", Map.of(
                "sku_id", skuId,
                "location_id", locationId,
                "delta", delta,
                "remaining", saved.getQuantityOnHand()
        ));

        (self != null ? self : this).realtimeSync(skuId, locationId, saved.getQuantityOnHand(), saved.getQuantityReserved());

        if (saved.getQuantityOnHand() < product.getReorderPoint()) {
            notificationService.triggerLowStock(skuId, locationId, saved.getQuantityOnHand(), product.getReorderPoint());
        }

        return saved;
    }

    public void realtimeSync(String skuId, String locationId, int quantityOnHand, int quantityReserved) {
        stockWebSocketHandler.broadcastStockUpdate(skuId, locationId, quantityOnHand, quantityReserved);
        if (channelAdapters != null) {
            for (ChannelAdapter adapter : channelAdapters) {
                adapter.pushStockUpdate(skuId, locationId, quantityOnHand, quantityReserved);
            }
        }
    }
}
