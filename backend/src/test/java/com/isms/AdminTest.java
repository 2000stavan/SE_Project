package com.isms;

import com.isms.domain.AdministratorService;
import com.isms.error.ApiException;
import com.isms.model.User;
import com.isms.model.enums.Role;
import com.isms.model.enums.UserStatus;
import com.isms.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminTest {

    @Autowired
    private AdministratorService administratorService;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("E2.1: User CRUD and account activation / unlocking")
    void testUserCrudAndUnlock() {
        String uid = "USR-TEST-" + System.currentTimeMillis();
        String email = uid.toLowerCase() + "@isms.com";

        // Create user
        User created = administratorService.createUser(uid, "Test Operator", email, Role.WAREHOUSE_STAFF, "secret123");
        assertNotNull(created);
        assertEquals(uid, created.getUserId());
        assertEquals(Role.WAREHOUSE_STAFF, created.getRole());
        assertEquals(UserStatus.ACTIVE, created.getStatus());

        // Deactivate user
        User deactivated = administratorService.updateUserStatus(uid, UserStatus.INACTIVE);
        assertEquals(UserStatus.INACTIVE, deactivated.getStatus());

        // Re-activate and unlock user
        User unlocked = administratorService.updateUserStatus(uid, UserStatus.ACTIVE);
        assertEquals(UserStatus.ACTIVE, unlocked.getStatus());

        // Verify duplicate prevention
        assertThrows(ApiException.class, () ->
                administratorService.createUser(uid, "Duplicate", "other@isms.com", Role.MANAGER, "pass"));
    }

    @Test
    @DisplayName("E2.2: Assign RBAC role to user")
    void testAssignRole() {
        String uid = "USR-ROLE-" + System.currentTimeMillis();
        administratorService.createUser(uid, "Role Switcher", uid.toLowerCase() + "@isms.com", Role.SALES_PERSONNEL, "pass123");

        User updated = administratorService.assignRole(uid, Role.MANAGER);
        assertEquals(Role.MANAGER, updated.getRole());

        User reUpdated = administratorService.assignRole(uid, Role.ADMINISTRATOR);
        assertEquals(Role.ADMINISTRATOR, reUpdated.getRole());
    }

    @Test
    @DisplayName("E2.1: List users contains created users")
    void testListUsers() {
        List<User> users = administratorService.listUsers();
        assertNotNull(users);
        assertFalse(users.isEmpty());
    }
}
