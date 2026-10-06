package com.isms.security;

import com.isms.config.AppProperties;
import com.isms.model.User;
import com.isms.model.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final AppProperties appProperties;
    private final SecretKey key;

    public JwtService(AppProperties appProperties) {
        this.appProperties = appProperties;
        String secret = appProperties.jwt().secret();
        if (secret.length() < 32) {
            secret = String.format("%-32s", secret).replace(' ', 'x');
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(appProperties.jwt().idleMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .subject(user.getUserId())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().getValue())
                .claim("name", user.getName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public String refreshToken(Claims claims) {
        Instant now = Instant.now();
        Instant expiry = now.plus(appProperties.jwt().idleMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .subject(claims.getSubject())
                .claim("email", claims.get("email"))
                .claim("role", claims.get("role"))
                .claim("name", claims.get("name"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public Claims parseAndValidateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public String getUserId(Claims claims) {
        return claims.getSubject();
    }

    public Role getRole(Claims claims) {
        String roleStr = (String) claims.get("role");
        return Role.fromValue(roleStr);
    }
}
