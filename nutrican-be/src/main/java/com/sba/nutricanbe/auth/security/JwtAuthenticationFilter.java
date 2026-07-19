package com.sba.nutricanbe.auth.security;

import com.sba.nutricanbe.auth.service.TokenRevocationService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.common.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final TokenRevocationService tokenRevocationService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        String jwt = null;

        if (authHeader != null && authHeader.toLowerCase().startsWith("bearer ")) {
            jwt = authHeader.substring(7);
        } else if (request.getRequestURI().startsWith("/ws/workspace")) {
            jwt = request.getParameter("token");
        }

        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (jwtUtil.validateToken(jwt) && !tokenRevocationService.isRevoked(jwt)) {
                String role = jwtUtil.getRoleFromToken(jwt);
                UUID userId = jwtUtil.getUserIdFromToken(jwt);
                User principalUser = userRepository.findById(userId).orElse(null);

                if (isActiveForAuthentication(principalUser)) {
                    java.util.List<org.springframework.security.core.GrantedAuthority> authorities = new java.util.ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    
                    // Role Hierarchy: PTs and ADMIN also have CUSTOMER privileges
                    if ("PT_CERTIFIED".equals(role) || "PT_FREELANCE".equals(role) || "ADMIN".equals(role)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
                    }
                    
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            principalUser,
                            null,
                            authorities
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            log.debug("JWT authentication skipped: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private boolean isActiveForAuthentication(User user) {
        return user != null
                && user.getStatus() != UserStatus.SUSPENDED
                && user.getStatus() != UserStatus.INACTIVE;
    }
}
