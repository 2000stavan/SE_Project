package com.isms.unit;

import com.isms.config.AppProperties;
import com.isms.security.LoginAttemptCache;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Experiment 10, Unit 2: LoginAttemptCache recordFailure / isLocked / reset (SRS Auth.Login.Fail).
 * Plain object, no Spring context. Old failures are written into the private map by reflection,
 * so the 15-minute window is tested without waiting. Test case IDs match Table 7 of the report.
 */
class LoginAttemptCacheUnitTest {

    private static LoginAttemptCache cache(int max, int windowMinutes) {
        return new LoginAttemptCache(new AppProperties(null, new AppProperties.Auth(max, windowMinutes),
                null, null, null, null, null, null));
    }

    /** Stores failures for {@code key} that happened {@code agesInSeconds} ago. */
    @SuppressWarnings("unchecked")
    private static void seed(LoginAttemptCache c, String key, long... agesInSeconds) throws Exception {
        Field field = LoginAttemptCache.class.getDeclaredField("failedAttempts");
        field.setAccessible(true);
        Map<String, List<Instant>> map = (Map<String, List<Instant>>) field.get(c);
        Instant now = Instant.now();
        List<Instant> attempts = map.computeIfAbsent(key, k -> new ArrayList<>());
        for (long age : agesInSeconds) {
            attempts.add(now.minusSeconds(age));
        }
    }

    @Test
    @DisplayName("UT2-01 a user with no failures is not locked")
    void ut2_01_newKeyNotLocked() {
        assertFalse(cache(5, 15).isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-02 the first failure returns 1 and does not lock")
    void ut2_02_firstFailure() {
        LoginAttemptCache c = cache(5, 15);
        assertEquals(1, c.recordFailure("USR-1"));
        assertFalse(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-03 four failures (limit - 1) count 1..4 and do not lock")
    void ut2_03_fourFailuresBelowLimit() {
        LoginAttemptCache c = cache(5, 15);
        for (int i = 1; i <= 4; i++) {
            assertEquals(i, c.recordFailure("USR-1"));
        }
        assertFalse(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-04 the fifth failure locks the account (on the limit)")
    void ut2_04_fifthFailureLocks() {
        LoginAttemptCache c = cache(5, 15);
        for (int i = 1; i <= 4; i++) c.recordFailure("USR-1");
        assertEquals(5, c.recordFailure("USR-1"));
        assertTrue(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-05 a sixth failure (limit + 1) returns 6 and stays locked")
    void ut2_05_sixthFailureStaysLocked() {
        LoginAttemptCache c = cache(5, 15);
        for (int i = 1; i <= 5; i++) c.recordFailure("USR-1");
        assertEquals(6, c.recordFailure("USR-1"));
        assertTrue(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-06 reset unlocks the user and restarts the count")
    void ut2_06_resetUnlocks() {
        LoginAttemptCache c = cache(5, 15);
        for (int i = 1; i <= 5; i++) c.recordFailure("USR-1");
        assertTrue(c.isLocked("USR-1"));
        c.reset("USR-1");
        assertFalse(c.isLocked("USR-1"));
        assertEquals(1, c.recordFailure("USR-1"));
    }

    @Test
    @DisplayName("UT2-07 locking one user does not affect another")
    void ut2_07_usersAreIndependent() {
        LoginAttemptCache c = cache(5, 15);
        for (int i = 1; i <= 5; i++) c.recordFailure("USR-1");
        assertTrue(c.isLocked("USR-1"));
        assertFalse(c.isLocked("USR-2"));
        assertEquals(1, c.recordFailure("USR-2"));
    }

    @Test
    @DisplayName("UT2-08 four failures 16 min old have expired, so a new failure counts 1")
    void ut2_08_oldFailuresExpire() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        seed(c, "USR-1", 16 * 60, 16 * 60, 16 * 60, 16 * 60);
        assertEquals(1, c.recordFailure("USR-1"));
        assertFalse(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-09 four failures 14 min 50 s old are inside the window, so the next one locks")
    void ut2_09_insideWindowCounts() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        seed(c, "USR-1", 14 * 60 + 50, 14 * 60 + 50, 14 * 60 + 50, 14 * 60 + 50);
        assertEquals(5, c.recordFailure("USR-1"));
        assertTrue(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-10 a failure 15 min 10 s ago has expired, so 3 + 1 failures do not lock")
    void ut2_10_justOutsideWindowExpires() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        seed(c, "USR-1", 15 * 60 + 10, 14 * 60 + 50, 14 * 60 + 50, 14 * 60 + 50); // ages in seconds
        assertEquals(4, c.recordFailure("USR-1"));
        assertFalse(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-11 isLocked ignores an expired entry (4 recent + 1 old is not locked)")
    void ut2_11_isLockedPurgesExpired() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        seed(c, "USR-1", 20 * 60, 60, 60, 60, 60);
        assertFalse(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-12 five recent failures mean the user is locked")
    void ut2_12_fiveRecentFailuresLocked() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        seed(c, "USR-1", 60, 60, 60, 60, 60);
        assertTrue(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-13 a lock expires by itself when all failures are 16 min old")
    void ut2_13_lockExpires() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        seed(c, "USR-1", 16 * 60, 16 * 60, 16 * 60, 16 * 60, 16 * 60);
        assertFalse(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-14 the limit comes from configuration (limit 3 locks on the 3rd failure)")
    void ut2_14_configuredLimit() {
        LoginAttemptCache c = cache(3, 15);
        c.recordFailure("USR-1");
        c.recordFailure("USR-1");
        assertFalse(c.isLocked("USR-1"));
        assertEquals(3, c.recordFailure("USR-1"));
        assertTrue(c.isLocked("USR-1"));
    }

    @Test
    @DisplayName("UT2-15 reset of a user that never failed is harmless")
    void ut2_15_resetUnknownKey() {
        LoginAttemptCache c = cache(5, 15);
        assertDoesNotThrow(() -> c.reset("NEVER-FAILED"));
        assertFalse(c.isLocked("NEVER-FAILED"));
    }

    @Test
    @DisplayName("UT2-16 20 simultaneous failures are all counted exactly once")
    void ut2_16_concurrentFailures() throws Exception {
        LoginAttemptCache c = cache(5, 15);
        int threads = 20;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return c.recordFailure("USR-1");
                }));
            }
            start.countDown();
            List<Integer> counts = new ArrayList<>();
            for (Future<Integer> f : futures) {
                counts.add(f.get(10, TimeUnit.SECONDS));
            }
            List<Integer> expected = IntStream.rangeClosed(1, threads).boxed().collect(Collectors.toList());
            assertEquals(expected, counts.stream().sorted().collect(Collectors.toList()));
        } finally {
            pool.shutdownNow();
        }
        assertTrue(c.isLocked("USR-1"));
        assertEquals(21, c.recordFailure("USR-1"));
    }

    @Test
    @DisplayName("UT2-17 a null key throws NullPointerException (finding F-2)")
    void ut2_17_nullKey() {
        LoginAttemptCache c = cache(5, 15);
        assertThrows(NullPointerException.class, () -> c.recordFailure(null));
        assertThrows(NullPointerException.class, () -> c.isLocked(null));
    }

    @Test
    @DisplayName("UT2-18 keys are case-sensitive (finding F-2)")
    void ut2_18_caseSensitiveKeys() {
        LoginAttemptCache c = cache(5, 15);
        assertEquals(1, c.recordFailure("USR-1"));
        assertEquals(1, c.recordFailure("usr-1"));
    }
}
