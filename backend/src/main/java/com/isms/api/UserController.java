package com.isms.api;

import com.isms.domain.AdministratorService;
import com.isms.model.User;
import com.isms.model.enums.Role;
import com.isms.model.enums.UserStatus;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class UserController {

    private final AdministratorService administratorService;

    public UserController(AdministratorService administratorService) {
        this.administratorService = administratorService;
    }

    public record CreateUserRequest(
            @NotBlank String user_id,
            @NotBlank String name,
            @NotBlank String email,
            @NotBlank String role,
            @NotBlank String password
    ) {}

    public record UpdateRoleRequest(@NotBlank String role) {}
    public record UpdateStatusRequest(@NotBlank String status) {}

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        List<Map<String, Object>> response = administratorService.listUsers().stream()
                .map(u -> Map.<String, Object>of(
                        "userId", u.getUserId(),
                        "name", u.getName(),
                        "email", u.getEmail(),
                        "role", u.getRole().getValue(),
                        "status", u.getStatus().getValue()
                ))
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody CreateUserRequest request) {
        Role role = Role.fromValue(request.role());
        User created = administratorService.createUser(
                request.user_id(),
                request.name(),
                request.email(),
                role,
                request.password()
        );
        return ResponseEntity.ok(Map.of(
                "userId", created.getUserId(),
                "name", created.getName(),
                "email", created.getEmail(),
                "role", created.getRole().getValue(),
                "status", created.getStatus().getValue()
        ));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<Map<String, Object>> updateRole(
            @PathVariable("id") String id,
            @RequestBody UpdateRoleRequest request
    ) {
        Role role = Role.fromValue(request.role());
        User updated = administratorService.assignRole(id, role);
        return ResponseEntity.ok(Map.of(
                "userId", updated.getUserId(),
                "role", updated.getRole().getValue()
        ));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable("id") String id,
            @RequestBody UpdateStatusRequest request
    ) {
        UserStatus status = UserStatus.fromValue(request.status());
        User updated = administratorService.updateUserStatus(id, status);
        return ResponseEntity.ok(Map.of(
                "userId", updated.getUserId(),
                "status", updated.getStatus().getValue()
        ));
    }
}
