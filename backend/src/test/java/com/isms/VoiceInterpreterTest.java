package com.isms;

import com.isms.domain.WarehouseStaffService;
import com.isms.domain.voice.VoiceInterpreter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class VoiceInterpreterTest {

    @Autowired
    private VoiceInterpreter interpreter;

    @Autowired
    private WarehouseStaffService warehouseStaffService;

    @Test
    @DisplayName("VoiceInterpreter parses standard commands with numeric quantity")
    void testStandardCommandNumeric() {
        VoiceInterpreter.InterpretationResult res =
                interpreter.interpret("add 20 units of SKU-1001 to location WH-01");

        assertTrue(res.valid());
        assertEquals("add", res.action());
        assertEquals("SKU-1001", res.sku());
        assertEquals(20, res.quantity());
        assertEquals("WH-01", res.location());
        assertTrue(res.spokenText().contains("Add 20 units of SKU-1001 in location WH-01. Please confirm."));
    }

    @Test
    @DisplayName("VoiceInterpreter parses word numbers (e.g. 'twenty', 'five')")
    void testWordNumbers() {
        VoiceInterpreter.InterpretationResult res =
                interpreter.interpret("remove five units of SKU-2002 from location STORE-01");

        assertTrue(res.valid());
        assertEquals("remove", res.action());
        assertEquals(5, res.quantity());
        assertEquals("SKU-2002", res.sku());
        assertEquals("STORE-01", res.location());
    }

    @Test
    @DisplayName("Voice command with confidence below threshold returns repeat_or_use_ui")
    void testLowConfidenceThreshold() {
        Map<String, Object> result = warehouseStaffService.captureVoiceCommand(
                "add 20 units of SKU-1001 to location WH-01",
                0.60, // Below 0.75 threshold
                "mic-1"
        );

        assertEquals("low_confidence", result.get("status"));
        assertEquals("repeat_or_use_ui", result.get("action"));
    }

    @Test
    @DisplayName("Voice command with confidence >= 0.75 proceeds to needs_confirmation")
    void testHighConfidenceConfirmation() {
        Map<String, Object> result = warehouseStaffService.captureVoiceCommand(
                "add 20 units of SKU-1001 to location WH-01",
                0.85,
                "mic-1"
        );

        assertEquals("needs_confirmation", result.get("status"));
        assertNotNull(result.get("token"));
        assertNotNull(result.get("spoken_text"));
    }
}
