package com.isms.security;

import com.isms.model.enums.Role;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            Claims claims = jwtService.parseAndValidateToken(token);

            if (claims != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                String userId = jwtService.getUserId(claims);
                Role role = jwtService.getRole(claims);

                String roleName = "ROLE_" + role.name();
                SimpleGrantedAuthority authority = new SimpleGrantedAuthority(roleName);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, null, Collections.singletonList(authority));
                authentication.setDetails(claims);
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Sliding expiration: send refreshed token in header
                String refreshed = jwtService.refreshToken(claims);
                response.setHeader("X-Refreshed-Token", refreshed);
            }
        }

        filterChain.doFilter(request, response);
    }
}
