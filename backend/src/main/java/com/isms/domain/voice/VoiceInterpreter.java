package com.isms.domain.voice;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class VoiceInterpreter {

    public record InterpretationResult(
            boolean valid,
            String action,
            String sku,
            int quantity,
            String location,
            String spokenText,
            String error
    ) {}

    private static final Map<String, Integer> WORD_NUMBERS = new HashMap<>();
    static {
        WORD_NUMBERS.put("one", 1);
        WORD_NUMBERS.put("two", 2);
        WORD_NUMBERS.put("three", 3);
        WORD_NUMBERS.put("four", 4);
        WORD_NUMBERS.put("five", 5);
        WORD_NUMBERS.put("six", 6);
        WORD_NUMBERS.put("seven", 7);
        WORD_NUMBERS.put("eight", 8);
        WORD_NUMBERS.put("nine", 9);
        WORD_NUMBERS.put("ten", 10);
        WORD_NUMBERS.put("fifteen", 15);
        WORD_NUMBERS.put("twenty", 20);
        WORD_NUMBERS.put("thirty", 30);
        WORD_NUMBERS.put("forty", 40);
        WORD_NUMBERS.put("fifty", 50);
        WORD_NUMBERS.put("hundred", 100);
    }

    // Grammar: add|remove|set|check <n> [units of] <sku|name> [to|from|in] [bin|location] <loc>
    private static final Pattern GRAMMAR_PATTERN = Pattern.compile(
            "^(add|remove|set|check)\\s+([a-zA-Z0-9]+)(?:\\s+units?(?:\\s+of)?)?\\s+([a-zA-Z0-9_-]+)(?:\\s+(?:to|from|in)(?:\\s+(?:bin|location))?\\s+([a-zA-Z0-9_-]+))?$",
            Pattern.CASE_INSENSITIVE
    );

    public InterpretationResult interpret(String transcript) {
        if (transcript == null || transcript.isBlank()) {
            return new InterpretationResult(false, null, null, 0, null, null, "Empty transcript");
        }

        String cleaned = transcript.trim().replaceAll("[.,!?;]", "").toLowerCase(Locale.ROOT);
        Matcher matcher = GRAMMAR_PATTERN.matcher(cleaned);

        if (!matcher.matches()) {
            return new InterpretationResult(false, null, null, 0, null, null, "Could not parse command format");
        }

        String action = matcher.group(1).toLowerCase();
        String qtyStr = matcher.group(2).toLowerCase();
        String sku = matcher.group(3).toUpperCase();
        String location = matcher.group(4) != null ? matcher.group(4).toUpperCase() : "WH-01";

        int quantity = parseQuantity(qtyStr);
        if (quantity < 0) {
            return new InterpretationResult(false, null, null, 0, null, null, "Invalid quantity: " + qtyStr);
        }

        String spoken = String.format("%s %d units of %s in location %s. Please confirm.",
                capitalize(action), quantity, sku, location);

        return new InterpretationResult(true, action, sku, quantity, location, spoken, null);
    }

    private int parseQuantity(String text) {
        if (WORD_NUMBERS.containsKey(text)) {
            return WORD_NUMBERS.get(text);
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}
