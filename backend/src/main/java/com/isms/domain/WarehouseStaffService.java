package com.isms.domain;

import com.isms.config.AppProperties;
import com.isms.domain.voice.VoiceInterpreter;
import com.isms.error.ApiException;
import com.isms.model.StockRecord;
import com.isms.repository.StockRecordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Transactional
public class WarehouseStaffService {

    private final PurchaseOrderService purchaseOrderService;
    private final VoiceInterpreter voiceInterpreter;
    private final StockRecordService stockRecordService;
    private final StockRecordRepository stockRecordRepository;
    private final AppProperties appProperties;

    // Tokens pending user confirmation
    private final Map<String, VoiceInterpreter.InterpretationResult> pendingTokens = new ConcurrentHashMap<>();
    // Idempotent processed client IDs for offline queue
    private final Set<String> processedClientIds = ConcurrentHashMap.newKeySet();

    public WarehouseStaffService(
            PurchaseOrderService purchaseOrderService,
            VoiceInterpreter voiceInterpreter,
            StockRecordService stockRecordService,
            StockRecordRepository stockRecordRepository,
            AppProperties appProperties
    ) {
        this.purchaseOrderService = purchaseOrderService;
        this.voiceInterpreter = voiceInterpreter;
        this.stockRecordService = stockRecordService;
        this.stockRecordRepository = stockRecordRepository;
        this.appProperties = appProperties;
    }

    public Map<String, Object> captureVoiceCommand(String transcript, double confidence, String deviceId) {
        double threshold = appProperties.voice().confidenceThreshold();
        if (confidence < threshold) {
            return Map.of(
                    "status", "low_confidence",
                    "action", "repeat_or_use_ui",
                    "confidence", confidence,
                    "threshold", threshold
            );
        }

        VoiceInterpreter.InterpretationResult result = voiceInterpreter.interpret(transcript);
        if (!result.valid()) {
            return Map.of(
                    "status", "low_confidence",
                    "action", "repeat_or_use_ui",
                    "error", result.error() != null ? result.error() : "Could not understand command"
            );
        }

        String token = "VCT-" + UUID.randomUUID().toString().substring(0, 8);
        pendingTokens.put(token, result);

        return Map.of(
                "status", "needs_confirmation",
                "token", token,
                "spoken_text", result.spokenText(),
                "interpreted", Map.of(
                        "action", result.action(),
                        "sku", result.sku(),
                        "quantity", result.quantity(),
                        "location", result.location()
                )
        );
    }

    public Map<String, Object> confirmVoiceCommand(String token, boolean confirmed) {
        VoiceInterpreter.InterpretationResult cmd = pendingTokens.remove(token);
        if (cmd == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "TOKEN_NOT_FOUND", "Confirmation token invalid or expired");
        }

        if (!confirmed) {
            return Map.of(
                    "status", "cancelled",
                    "spoken_text", "Command cancelled."
            );
        }

        int targetQty = cmd.quantity();
        if ("add".equalsIgnoreCase(cmd.action())) {
            int current = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(cmd.sku(), cmd.location())
                    .map(StockRecord::getQuantityOnHand).orElse(0);
            targetQty = current + cmd.quantity();
        } else if ("remove".equalsIgnoreCase(cmd.action())) {
            int current = stockRecordRepository.findBySkuIdAndLocationIdForUpdate(cmd.sku(), cmd.location())
                    .map(StockRecord::getQuantityOnHand).orElse(0);
            targetQty = Math.max(0, current - cmd.quantity());
        }

        StockRecord updated = stockRecordService.updateStock(cmd.sku(), cmd.location(), targetQty);

        return Map.of(
                "status", "committed",
                "spoken_text", String.format("Stock updated for %s in %s. New quantity is %d.", cmd.sku(), cmd.location(), updated.getQuantityOnHand()),
                "stock", Map.of(
                        "sku", cmd.sku(),
                        "location", cmd.location(),
                        "quantityOnHand", updated.getQuantityOnHand()
                )
        );
    }

    public List<Map<String, Object>> processQueuedCommands(List<Map<String, Object>> queue) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (queue == null) return results;

        for (Map<String, Object> item : queue) {
            String clientId = (String) item.get("client_id");
            String transcript = (String) item.get("transcript");

            if (clientId != null && processedClientIds.contains(clientId)) {
                results.add(Map.of("client_id", clientId, "status", "already_processed"));
                continue;
            }

            Map<String, Object> captured = captureVoiceCommand(transcript, 1.0, "offline-replay");
            if ("needs_confirmation".equals(captured.get("status"))) {
                String token = (String) captured.get("token");
                Map<String, Object> committed = confirmVoiceCommand(token, true);
                if (clientId != null) processedClientIds.add(clientId);
                results.add(Map.of("client_id", clientId != null ? clientId : "", "status", "committed", "result", committed));
            } else {
                results.add(Map.of("client_id", clientId != null ? clientId : "", "status", "failed", "details", captured));
            }
        }
        return results;
    }

    public void receivePoConfirm(String poId, String staffId, List<Map<String, Object>> lines) {
        purchaseOrderService.receiveConfirm(poId, staffId, lines);
    }
}
