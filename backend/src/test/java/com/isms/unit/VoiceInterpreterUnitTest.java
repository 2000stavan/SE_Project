package com.isms.unit;

import com.isms.domain.voice.VoiceInterpreter;
import com.isms.domain.voice.VoiceInterpreter.InterpretationResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Experiment 10, Unit 1: VoiceInterpreter.interpret() (SRS Voice.Command.Interpret).
 * Plain object, no Spring context. Test case IDs match Table 5 of the report.
 */
class VoiceInterpreterUnitTest {

    private final VoiceInterpreter interpreter = new VoiceInterpreter();

    private InterpretationResult ok(String transcript) {
        InterpretationResult r = interpreter.interpret(transcript);
        assertTrue(r.valid(), () -> "expected a valid result for \"" + transcript + "\" but got: " + r.error());
        assertNull(r.error());
        return r;
    }

    private void assertRejected(String transcript, String expectedError) {
        InterpretationResult r = interpreter.interpret(transcript);
        assertFalse(r.valid(), () -> "expected \"" + transcript + "\" to be rejected");
        assertEquals(expectedError, r.error());
        assertNull(r.action());
        assertNull(r.sku());
        assertNull(r.location());
        assertNull(r.spokenText());
        assertEquals(0, r.quantity());
    }

    @Test
    @DisplayName("UT1-01 add command with a numeric quantity")
    void ut1_01_addWithNumericQuantity() {
        InterpretationResult r = ok("add 20 units of SKU-1001 to location WH-01");
        assertEquals("add", r.action());
        assertEquals(20, r.quantity());
        assertEquals("SKU-1001", r.sku());
        assertEquals("WH-01", r.location());
    }

    @Test
    @DisplayName("UT1-02 remove command with a spoken quantity")
    void ut1_02_removeWithWordQuantity() {
        InterpretationResult r = ok("remove five units of SKU-2002 from location STORE-01");
        assertEquals("remove", r.action());
        assertEquals(5, r.quantity());
        assertEquals("SKU-2002", r.sku());
        assertEquals("STORE-01", r.location());
    }

    @Test
    @DisplayName("UT1-03 set command, \"in bin\", SKU is upper-cased")
    void ut1_03_setInBinUpperCasesSku() {
        InterpretationResult r = ok("set 50 units of sku-002 in bin A12");
        assertEquals("set", r.action());
        assertEquals(50, r.quantity());
        assertEquals("SKU-002", r.sku());
        assertEquals("A12", r.location());
    }

    @Test
    @DisplayName("UT1-04 no \"units of\" and no location: location defaults to WH-01")
    void ut1_04_defaultLocation() {
        InterpretationResult r = ok("check 10 SKU-003");
        assertEquals("check", r.action());
        assertEquals(10, r.quantity());
        assertEquals("SKU-003", r.sku());
        assertEquals("WH-01", r.location());
    }

    @Test
    @DisplayName("UT1-05 mixed case, surrounding spaces and \"!\" are ignored")
    void ut1_05_caseSpacesAndPunctuation() {
        InterpretationResult r = ok("  ADD Twenty UNITS OF sku-004 to Location wh-02!  ");
        assertEquals("add", r.action());
        assertEquals(20, r.quantity());
        assertEquals("SKU-004", r.sku());
        assertEquals("WH-02", r.location());
    }

    @ParameterizedTest(name = "UT1-06 \"{0}\" -> {1}")
    @DisplayName("UT1-06 every supported spoken number")
    @CsvSource({
            "one,1", "two,2", "three,3", "four,4", "five,5", "six,6", "seven,7", "eight,8",
            "nine,9", "ten,10", "fifteen,15", "twenty,20", "thirty,30", "forty,40", "fifty,50", "hundred,100"
    })
    void ut1_06_wordNumbers(String word, int expected) {
        assertEquals(expected, ok("add " + word + " units of sku-1").quantity());
    }

    @ParameterizedTest(name = "UT1-07 verb \"{0}\"")
    @DisplayName("UT1-07 every verb is recognised")
    @ValueSource(strings = {"add", "remove", "set", "check"})
    void ut1_07_everyVerb(String verb) {
        InterpretationResult r = ok(verb + " 3 units of sku-1");
        assertEquals(verb, r.action());
        assertEquals(3, r.quantity());
        assertEquals("SKU-1", r.sku());
    }

    @ParameterizedTest(name = "UT1-08 \"{0}\"")
    @DisplayName("UT1-08 to / from / in, with and without bin / location")
    @ValueSource(strings = {
            "add 5 units of sku-1 to wh-02",
            "add 5 units of sku-1 from wh-02",
            "add 5 units of sku-1 in wh-02",
            "add 5 units of sku-1 to location wh-02",
            "add 5 units of sku-1 from bin wh-02",
            "add 5 units of sku-1 in location wh-02"
    })
    void ut1_08_locationGrammarVariants(String transcript) {
        InterpretationResult r = ok(transcript);
        assertEquals("WH-02", r.location());
        assertEquals("SKU-1", r.sku());
        assertEquals(5, r.quantity());
    }

    @ParameterizedTest(name = "UT1-09 \"{0}\"")
    @DisplayName("UT1-09 \"unit of\", \"units of\", \"units\" or no unit word")
    @ValueSource(strings = {
            "add 7 unit of sku-5",
            "add 7 units of sku-5",
            "add 7 units sku-5",
            "add 7 sku-5"
    })
    void ut1_09_unitWordVariants(String transcript) {
        InterpretationResult r = ok(transcript);
        assertEquals(7, r.quantity());
        assertEquals("SKU-5", r.sku());
        assertEquals("WH-01", r.location());
    }

    @Test
    @DisplayName("UT1-10 underscores and hyphens in SKU and location")
    void ut1_10_symbolsInSkuAndLocation() {
        InterpretationResult r = ok("add 5 units of sku_9-x1 to location bin-7");
        assertEquals("SKU_9-X1", r.sku());
        assertEquals("BIN-7", r.location());
    }

    @Test
    @DisplayName("UT1-11 the read-back text asks the user to confirm")
    void ut1_11_spokenReadBack() {
        InterpretationResult r = ok("remove five units of SKU-2002 from location STORE-01");
        assertEquals("Remove 5 units of SKU-2002 in location STORE-01. Please confirm.", r.spokenText());
    }

    @Test
    @DisplayName("UT1-12 quantity 0 is accepted at this layer (finding F-1)")
    void ut1_12_zeroQuantity() {
        assertEquals(0, ok("add 0 units of sku-1").quantity());
    }

    @Test
    @DisplayName("UT1-13 a large quantity that fits an int is accepted")
    void ut1_13_largeQuantity() {
        assertEquals(999999, ok("add 999999 units of sku-1").quantity());
    }

    @Test
    @DisplayName("UT1-14 a quantity that overflows an int is rejected")
    void ut1_14_overflowQuantity() {
        assertRejected("add 99999999999 units of sku-1", "Invalid quantity: 99999999999");
    }

    @ParameterizedTest(name = "UT1-15 \"{0}\"")
    @DisplayName("UT1-15 unsupported quantity words are rejected (finding F-1)")
    @ValueSource(strings = {"eleven", "zero", "lots"})
    void ut1_15_unsupportedQuantityWord(String word) {
        assertRejected("add " + word + " units of sku-1", "Invalid quantity: " + word);
    }

    @ParameterizedTest(name = "UT1-16 [{index}] \"{0}\"")
    @DisplayName("UT1-16 null, empty and blank transcripts")
    @NullSource
    @ValueSource(strings = {"", " ", "     "})
    void ut1_16_emptyTranscript(String transcript) {
        assertRejected(transcript, "Empty transcript");
    }

    @ParameterizedTest(name = "UT1-17 \"{0}\"")
    @DisplayName("UT1-17 unknown verb or incomplete command")
    @ValueSource(strings = {"delete 5 units of sku-1", "hello world", "add", "add 5"})
    void ut1_17_badGrammar(String transcript) {
        assertRejected(transcript, "Could not parse command format");
    }

    @Test
    @DisplayName("UT1-18 a negative quantity does not match the grammar")
    void ut1_18_negativeQuantity() {
        assertRejected("add -5 units of sku-1", "Could not parse command format");
    }

    @ParameterizedTest(name = "UT1-19 \"{0}\"")
    @DisplayName("UT1-19 extra or unknown words are rejected")
    @ValueSource(strings = {"add 5 units of sku-1 to location wh-01 now", "add 5 units of sku-1 at wh-01"})
    void ut1_19_extraWords(String transcript) {
        assertRejected(transcript, "Could not parse command format");
    }

    @ParameterizedTest(name = "UT1-20 \"{0}\"")
    @DisplayName("UT1-20 speech-to-text punctuation is ignored")
    @CsvSource(delimiter = '|', value = {
            "ADD 20 UNITS OF SKU-1.|WH-01",
            "add 20 units of sku-1, to location wh-03|WH-03",
            "add 20 units of sku-1 to location wh-05?|WH-05"
    })
    void ut1_20_punctuationIgnored(String transcript, String expectedLocation) {
        InterpretationResult r = ok(transcript);
        assertEquals("add", r.action());
        assertEquals(20, r.quantity());
        assertEquals("SKU-1", r.sku());
        assertEquals(expectedLocation, r.location());
    }

    @Test
    @DisplayName("UT1-21 a rejected command carries no data")
    void ut1_21_rejectedResultIsEmpty() {
        InterpretationResult r = interpreter.interpret("hello world");
        assertFalse(r.valid());
        assertNull(r.action());
        assertNull(r.sku());
        assertNull(r.location());
        assertNull(r.spokenText());
        assertEquals(0, r.quantity());
        assertEquals("Could not parse command format", r.error());
    }
}
