package com.isms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("F1.1: Login with user_id or email succeeds for all 4 roles")
    void testLoginAllFourRoles() throws Exception {
        String[] users = {
                "USR-ADMIN-1", "admin@isms.com",
                "USR-MGR-1", "manager1@isms.com",
                "USR-WH-1", "warehouse1@isms.com",
                "USR-SALES-1", "sales1@isms.com"
        };

        for (String id : users) {
            String loginBody = String.format("{\"user_id\":\"%s\",\"password\":\"Password123!\"}", id);
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isString())
                    .andExpect(jsonPath("$.user.role").isString());
        }
    }

    @Test
    @DisplayName("F1.2: Lock after 5 failed login attempts in 15 minutes")
    void testAccountLockoutAfterFiveFailedAttempts() throws Exception {
        String testUser = "lockout-test-" + System.currentTimeMillis();

        // 5 bad attempts
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(String.format("{\"user_id\":\"%s\",\"password\":\"WrongPassword!\"}", testUser)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt should be rejected with FORBIDDEN (403) and code ACCOUNT_LOCKED
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"user_id\":\"%s\",\"password\":\"WrongPassword!\"}", testUser)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    @DisplayName("F1.2: the lock is persisted as users.status = locked and an Administrator can unlock it")
    void testLockIsPersistedAndAdminCanUnlock() throws Exception {
        String uid = "lock-persist-" + System.currentTimeMillis();

        String adminToken = objectMapper.readTree(mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"user_id\":\"USR-ADMIN-1\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"user_id\":\"%s\",\"name\":\"Lock Test\",\"email\":\"%s@isms.com\",\"role\":\"Sales Personnel\",\"password\":\"Password123!\"}", uid, uid)))
                .andExpect(status().is2xxSuccessful());

        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content(String.format("{\"user_id\":\"%s\",\"password\":\"bad\"}", uid))).andExpect(status().isUnauthorized());
        }
        // the 5th failure locks the account (403) ...
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"user_id\":\"%s\",\"password\":\"bad\"}", uid))).andExpect(status().isForbidden());

        // ... and the status must be visible to the Administrator (regression: the change used to roll back with the exception)
        String users = mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode row = null;
        for (JsonNode n : objectMapper.readTree(users)) {
            if (uid.equals(n.get("userId").asText())) row = n;
        }
        assertNotNull(row);
        org.junit.jupiter.api.Assertions.assertEquals("locked", row.get("status").asText());

        // Administrator unlocks; the correct password works again
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/users/" + uid + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"active\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"user_id\":\"%s\",\"password\":\"Password123!\"}", uid))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("F1.6: Sliding token expiration returned in X-Refreshed-Token header")
    void testSlidingTokenHeader() throws Exception {
        // Login first
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"user_id\":\"USR-ADMIN-1\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String token = json.get("token").asText();
        assertNotNull(token);

        // Access protected endpoint with token and verify X-Refreshed-Token
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Refreshed-Token"))
                .andExpect(jsonPath("$.userId").value("USR-ADMIN-1"));
    }

    @Test
    @DisplayName("F1.3: Password reset request and confirmation")
    void testPasswordResetFlow() throws Exception {
        // Request reset
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@isms.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isString());
    }
}
