package com.isms.api;

import com.isms.domain.StockRecordService;
import com.isms.model.StockRecord;
import com.isms.repository.StockRecordRepository;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stock")
public class StockController {

    private final StockRecordService stockRecordService;
    private final StockRecordRepository stockRecordRepository;

    public StockController(StockRecordService stockRecordService, StockRecordRepository stockRecordRepository) {
        this.stockRecordService = stockRecordService;
        this.stockRecordRepository = stockRecordRepository;
    }

    public record UpdateStockRequest(@NotNull @Min(0) Integer quantity_on_hand) {}
    public record AdjustStockRequest(@NotNull String sku, @NotNull String location, @NotNull Integer delta, String reason) {}

    @GetMapping
    public ResponseEntity<List<StockRecord>> getStock(
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer min,
            @RequestParam(required = false) Integer max
    ) {
        List<StockRecord> results = stockRecordRepository.searchStock(sku, location, min, max);
        return ResponseEntity.ok(results);
    }

    @PutMapping("/{sku}/{location}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<StockRecord> updateStock(
            @PathVariable("sku") String sku,
            @PathVariable("location") String location,
            @RequestBody UpdateStockRequest request
    ) {
        StockRecord updated = stockRecordService.updateStock(sku, location, request.quantity_on_hand());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'MANAGER', 'WAREHOUSE_STAFF')")
    public ResponseEntity<StockRecord> adjustStock(@RequestBody AdjustStockRequest request) {
        StockRecord result;
        if (request.delta() < 0) {
            result = stockRecordService.deductStock(request.sku(), request.location(), Math.abs(request.delta()));
        } else {
            StockRecord current = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(request.sku(), request.location())
                    .orElse(null);
            int newTotal = (current != null ? current.getQuantityOnHand() : 0) + request.delta();
            result = stockRecordService.updateStock(request.sku(), request.location(), newTotal);
        }
        return ResponseEntity.ok(result);
    }
}
