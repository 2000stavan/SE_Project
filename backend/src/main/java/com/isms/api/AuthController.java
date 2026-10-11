package com.isms.api;

import com.isms.domain.UserService;
import com.isms.model.User;
import com.isms.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;

    public AuthController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    public record LoginRequest(
            String user_id,
            String email,
            @NotBlank(message = "Password is required") String password
    ) {
        public String identifier() {
            return user_id != null && !user_id.isBlank() ? user_id : email;
        }
    }

    public record PasswordResetInitRequest(@NotBlank(message = "Email is required") String email) {}
    public record PasswordResetConfirmRequest(
            @NotBlank(message = "Token is required") String token,
            @NotBlank(message = "New password is required") String new_password
    ) {}

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        Map<String, Object> result = userService.login(request.identifier(), request.password());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            userService.logout(auth.getPrincipal().toString());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<Map<String, String>> requestPasswordReset(@RequestBody @jakarta.validation.Valid PasswordResetInitRequest request) {
        userService.resetPassword(request.email());
        return ResponseEntity.ok(Map.of("message", "If an account with that email exists, a reset link has been dispatched"));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Map<String, String>> confirmPasswordReset(@RequestBody @jakarta.validation.Valid PasswordResetConfirmRequest request) {
        userService.resetPassword(request.token(), request.new_password());
        return ResponseEntity.ok(Map.of("message", "Password has been successfully reset"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }

        String userId = auth.getPrincipal().toString();
        User user = userRepository.findByUserId(userId)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
                "userId", user.getUserId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole().getValue(),
                "status", user.getStatus().getValue()
        ));
    }
}
