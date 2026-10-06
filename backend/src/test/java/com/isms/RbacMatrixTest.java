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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RbacMatrixTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String loginAndGetToken(String userId) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"user_id\":\"%s\",\"password\":\"Password123!\"}", userId)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(res.getResponse().getContentAsString());
        return json.get("token").asText();
    }

    @Test
    @DisplayName("RBAC: Admin endpoints return 200 for Administrator but 403 for Manager, Warehouse, Sales")
    void testUserAdminAccessMatrix() throws Exception {
        String adminToken = loginAndGetToken("USR-ADMIN-1");
        String managerToken = loginAndGetToken("USR-MGR-1");
        String warehouseToken = loginAndGetToken("USR-WH-1");
        String salesToken = loginAndGetToken("USR-SALES-1");

        // Administrator -> OK
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Manager -> 403 Forbidden
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());

        // Warehouse Staff -> 403 Forbidden
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + warehouseToken))
                .andExpect(status().isForbidden());

        // Sales Personnel -> 403 Forbidden
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + salesToken))
                .andExpect(status().isForbidden());

        // Unauthenticated -> 401 Unauthorized or 403 Forbidden
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }
}
