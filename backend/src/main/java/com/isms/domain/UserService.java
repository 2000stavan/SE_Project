package com.isms.domain;

import com.isms.adapter.MailerAdapter;
import com.isms.audit.AuditLogger;
import com.isms.error.ApiException;
import com.isms.model.User;
import com.isms.model.enums.UserStatus;
import com.isms.repository.UserRepository;
import com.isms.security.JwtService;
import com.isms.security.LoginAttemptCache;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptCache loginAttemptCache;
    private final MailerAdapter mailerAdapter;
    private final AuditLogger auditLogger;

    private final Set<String> usedResetTokens = ConcurrentHashMap.newKeySet();

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            LoginAttemptCache loginAttemptCache,
            MailerAdapter mailerAdapter,
            AuditLogger auditLogger
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptCache = loginAttemptCache;
        this.mailerAdapter = mailerAdapter;
        this.auditLogger = auditLogger;
    }

    // noRollbackFor: the 5th failed login throws ACCOUNT_LOCKED *after* setting status=locked; that change must be
    // committed, otherwise the lock exists only in memory and the Administrator never sees (or can unlock) the account.
    @Transactional(noRollbackFor = ApiException.class)
    public Map<String, Object> login(String identifier, String password) {
        if (identifier == null || identifier.isBlank() || password == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Identifier and password are required");
        }

        if (loginAttemptCache.isLocked(identifier)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account locked due to 5 failed attempts in 15 minutes");
        }

        User user = userRepository.findByUserIdOrEmail(identifier).orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getHashedPassword())) {
            int failures = loginAttemptCache.recordFailure(identifier);
            if (user != null && failures >= 5) {
                user.setStatus(UserStatus.LOCKED);
                userRepository.save(user);
                auditLogger.log(user.getUserId(), "ACCOUNT_LOCKED", "users", Map.of("reason", "5_failed_logins"));
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account locked due to 5 failed attempts in 15 minutes");
            }
            auditLogger.log(identifier, "LOGIN_FAILED", "users", Map.of("failure_count", failures));
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid user ID/email or password");
        }

        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked. Please contact administrator.");
        }

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
        }

        loginAttemptCache.reset(identifier);
        loginAttemptCache.reset(user.getUserId());
        loginAttemptCache.reset(user.getEmail());

        String token = jwtService.generateToken(user);
        auditLogger.log(user.getUserId(), "LOGIN_SUCCESS", "users", Map.of("role", user.getRole().getValue()));

        return Map.of(
                "token", token,
                "user", Map.of(
                        "userId", user.getUserId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole().getValue(),
                        "status", user.getStatus().getValue()
                )
        );
    }

    public void logout(String userId) {
        auditLogger.log(userId, "LOGOUT", "users", Map.of());
    }

    public void resetPassword(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Generic response to prevent email enumeration
            return;
        }

        String resetToken = jwtService.generateToken(user);
        String resetLink = "http://localhost:3000/password-reset?token=" + resetToken;
        mailerAdapter.sendEmail(
                user.getEmail(),
                "ISMS Password Reset Request",
                "Hello " + user.getName() + ",\n\nPlease click the link below to reset your password (valid for 30 minutes):\n" +
                resetLink + "\n\nToken: " + resetToken
        );
        auditLogger.log(user.getUserId(), "PASSWORD_RESET_REQUESTED", "users", Map.of("email", email));
    }

    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Token and new password are required");
        }

        if (usedResetTokens.contains(token)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TOKEN_ALREADY_USED", "Reset token has already been used");
        }

        Claims claims = jwtService.parseAndValidateToken(token);
        if (claims == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOKEN", "Reset token is invalid or expired");
        }

        String userId = jwtService.getUserId(claims);
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        user.setHashedPassword(passwordEncoder.encode(newPassword));
        if (user.getStatus() == UserStatus.LOCKED) {
            user.setStatus(UserStatus.ACTIVE);
            loginAttemptCache.reset(user.getUserId());
            loginAttemptCache.reset(user.getEmail());
        }
        userRepository.save(user);
        usedResetTokens.add(token);

        auditLogger.log(user.getUserId(), "PASSWORD_RESET_COMPLETED", "users", Map.of());
    }
}
