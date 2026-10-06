package com.isms;

import com.isms.domain.ProductService;
import com.isms.domain.StockRecordService;
import com.isms.domain.UserService;
import com.isms.domain.voice.VoiceInterpreter;
import com.isms.error.ApiException;
import com.isms.model.Product;
import com.isms.repository.ProductRepository;
import com.isms.security.JwtService;
import com.isms.security.LoginAttemptCache;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class NfrTest {

    @Autowired
    private StockRecordService stockRecordService;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private LoginAttemptCache loginAttemptCache;

    @Autowired
    private VoiceInterpreter voiceInterpreter;

    @Autowired
    private JwtService jwtService;

    @Test
    @DisplayName("NFR PE-2: Multi-channel stock synchronization executes within 5.0s latency threshold")
    void testStockSyncLatency() {
        String sku = "SKU-NFR-" + System.currentTimeMillis();
        productService.create(new Product(
                sku, "NFR Test Item", "Electronics",
                BigDecimal.valueOf(100.00), 5, "PCS"
        ));

        long start = System.currentTimeMillis();
        // Update stock triggers realtimeSync to marketplace & storefront adapters
        stockRecordService.updateStock(sku, "WH-01", 50);
        long duration = System.currentTimeMillis() - start;

        assertTrue(duration < 5000, "Stock sync should complete well under 5000ms, took " + duration + "ms");
    }

    @Test
    @DisplayName("NFR SE-1 / Auth.Lockout: 5 failed login attempts locks user account")
    void testFailedLoginLockout() {
        String testUser = "usr-nfr-lockout";
        loginAttemptCache.reset(testUser);

        // Fail 4 times -> still allowed
        for (int i = 1; i <= 4; i++) {
            final int attempt = i;
            assertThrows(ApiException.class, () ->
                    userService.login(testUser, "wrong-password-" + attempt)
            );
            assertFalse(loginAttemptCache.isLocked(testUser), "Should not be locked after " + i + " failures");
        }

        // 5th failure -> locked
        assertThrows(ApiException.class, () ->
                userService.login(testUser, "wrong-password-5")
        );
        assertTrue(loginAttemptCache.isLocked(testUser), "Account must be locked after 5 failed attempts");
    }

    @Test
    @DisplayName("NFR PE-3: 100 concurrent voice interpretations complete within 3.0s total")
    void testConcurrentVoiceInterpretationThroughput() throws InterruptedException, ExecutionException {
        int tasksCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(20);
        List<Future<VoiceInterpreter.InterpretationResult>> futures = new ArrayList<>();

        long start = System.currentTimeMillis();

        for (int i = 0; i < tasksCount; i++) {
            futures.add(executor.submit(() ->
                    voiceInterpreter.interpret("add 15 units of SKU-1001 to location WH-01")
            ));
        }

        for (Future<VoiceInterpreter.InterpretationResult> f : futures) {
            VoiceInterpreter.InterpretationResult res = f.get();
            assertTrue(res.valid());
            assertEquals("add", res.action());
        }

        long duration = System.currentTimeMillis() - start;
        executor.shutdown();

        assertTrue(duration < 3000, "100 concurrent voice parses must finish within 3000ms, took " + duration + "ms");
    }

    @Test
    @DisplayName("NFR Auth.Session.Timeout: Sliding session JWT token generation and validation")
    void testSlidingSessionTokenRenewal() {
        com.isms.model.User user = new com.isms.model.User(
                "USR-NFR-SLIDE", "Slide Admin", "admin@isms.com",
                com.isms.model.enums.Role.ADMINISTRATOR, "hash", com.isms.model.enums.UserStatus.ACTIVE
        );
        String token = jwtService.generateToken(user);
        assertNotNull(token);

        io.jsonwebtoken.Claims claims = jwtService.parseAndValidateToken(token);
        assertNotNull(claims);
        assertEquals("USR-NFR-SLIDE", jwtService.getUserId(claims));
        assertEquals(com.isms.model.enums.Role.ADMINISTRATOR, jwtService.getRole(claims));

        String refreshed = jwtService.refreshToken(claims);
        assertNotNull(refreshed);
        io.jsonwebtoken.Claims refreshedClaims = jwtService.parseAndValidateToken(refreshed);
        assertNotNull(refreshedClaims);
        assertEquals("USR-NFR-SLIDE", jwtService.getUserId(refreshedClaims));
    }
}
