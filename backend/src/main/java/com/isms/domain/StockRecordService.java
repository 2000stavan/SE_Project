package com.isms.domain;

import com.isms.error.ApiException;
import com.isms.model.StockRecord;
import com.isms.model.StockRecordId;
import com.isms.repository.StockRecordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Transactional
public class StockRecordService {

    private final StockRecordRepository stockRecordRepository;

    public StockRecordService(StockRecordRepository stockRecordRepository) {
        this.stockRecordRepository = stockRecordRepository;
    }

    public StockRecord updateStock(String skuId, String locationId, int quantityOnHand) {
        if (quantityOnHand < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_QUANTITY", "Quantity on hand cannot be negative (BR-3)");
        }

        StockRecord stock = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(skuId, locationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "STOCK_NOT_FOUND", "Stock record not found"));

        stock.setQuantityOnHand(quantityOnHand);
        stock.setLastUpdated(OffsetDateTime.now());
        StockRecord saved = stockRecordRepository.save(stock);
        realtimeSync(skuId, locationId, saved.getQuantityOnHand(), saved.getQuantityReserved());
        return saved;
    }

    public StockRecord deductStock(String skuId, String locationId, int delta) {
        if (delta <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DELTA", "Deduct delta must be greater than zero");
        }

        StockRecord stock = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(skuId, locationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "STOCK_NOT_FOUND", "Stock record not found"));

        if (stock.getQuantityOnHand() - delta < 0) {
            throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Insufficient stock on hand to deduct");
        }

        stock.setQuantityOnHand(stock.getQuantityOnHand() - delta);
        stock.setLastUpdated(OffsetDateTime.now());
        StockRecord saved = stockRecordRepository.save(stock);
        realtimeSync(skuId, locationId, saved.getQuantityOnHand(), saved.getQuantityReserved());
        return saved;
    }

    public void realtimeSync(String skuId, String locationId, int quantityOnHand, int quantityReserved) {
        // Broadcasts to WebSockets & channel adapters (expanded in P2)
    }
}
