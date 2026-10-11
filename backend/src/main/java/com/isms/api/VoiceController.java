package com.isms.api;

import com.isms.domain.WarehouseStaffService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/voice")
public class VoiceController {

    private final WarehouseStaffService warehouseStaffService;

    public VoiceController(WarehouseStaffService warehouseStaffService) {
        this.warehouseStaffService = warehouseStaffService;
    }

    public record VoiceCommandRequest(
            @NotBlank String transcript,
            @NotNull Double confidence,
            String device_id
    ) {}

    public record VoiceConfirmRequest(
            @NotBlank String token,
            @NotNull Boolean confirmed
    ) {}

    @PostMapping("/command")
    @PreAuthorize("hasAnyRole('WAREHOUSE_STAFF', 'ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> captureVoiceCommand(@RequestBody @jakarta.validation.Valid VoiceCommandRequest request) {
        Map<String, Object> result = warehouseStaffService.captureVoiceCommand(
                request.transcript(),
                request.confidence(),
                request.device_id()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('WAREHOUSE_STAFF', 'ADMINISTRATOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> confirmVoiceCommand(@RequestBody @jakarta.validation.Valid VoiceConfirmRequest request) {
        Map<String, Object> result = warehouseStaffService.confirmVoiceCommand(request.token(), request.confirmed());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/command/queued")
    @PreAuthorize("hasRole('WAREHOUSE_STAFF')")
    public ResponseEntity<List<Map<String, Object>>> processQueuedCommands(@RequestBody List<Map<String, Object>> queue) {
        List<Map<String, Object>> results = warehouseStaffService.processQueuedCommands(queue);
        return ResponseEntity.ok(results);
    }
}
