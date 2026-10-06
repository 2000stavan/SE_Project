package com.isms.security;

import com.isms.config.AppProperties;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginAttemptCache {

    private final AppProperties appProperties;
    private final Map<String, List<Instant>> failedAttempts = new ConcurrentHashMap<>();

    public LoginAttemptCache(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public synchronized int recordFailure(String key) {
        Instant now = Instant.now();
        int windowMinutes = appProperties.auth().failWindowMinutes();
        Instant cutoff = now.minusSeconds(windowMinutes * 60L);

        List<Instant> attempts = failedAttempts.computeIfAbsent(key, k -> new ArrayList<>());
        attempts.removeIf(ts -> ts.isBefore(cutoff));
        attempts.add(now);
        return attempts.size();
    }

    public synchronized boolean isLocked(String key) {
        int max = appProperties.auth().maxFailedAttempts();
        int windowMinutes = appProperties.auth().failWindowMinutes();
        Instant cutoff = Instant.now().minusSeconds(windowMinutes * 60L);

        List<Instant> attempts = failedAttempts.get(key);
        if (attempts == null) return false;
        attempts.removeIf(ts -> ts.isBefore(cutoff));
        return attempts.size() >= max;
    }

    public synchronized void reset(String key) {
        failedAttempts.remove(key);
    }
}
