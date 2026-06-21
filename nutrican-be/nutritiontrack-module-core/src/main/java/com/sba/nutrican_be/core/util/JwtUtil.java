package com.sba.nutrican_be.core.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.security.jwt.secret-key}") String secretKey,
            @Value("${app.security.jwt.expiration}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String email, UUID userId, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(email)
                .claim("userId", userId.toString())
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String email, UUID userId) {
        Date now = new Date();
        long refreshExpiration = expirationMs * 7;
        Date expiryDate = new Date(now.getTime() + refreshExpiration);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(email)
                .claim("type", "refresh")
                .claim("userId", userId.toString())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String generateLimitedToken(String email, UUID userId, String role) {
        Date now = new Date();
        long limitedExpiration = expirationMs;
        Date expiryDate = new Date(now.getTime() + limitedExpiration);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(email)
                .claim("userId", userId.toString())
                .claim("role", role)
                .claim("limited", true)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public UUID getUserIdFromToken(String token) {
        return UUID.fromString(parseClaims(token).get("userId", String.class));
    }

    public UUID getUserIdFromRefreshToken(String token) {
        return UUID.fromString(parseClaims(token).get("userId", String.class));
    }

    public String getRoleFromToken(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public String getTokenId(String token) {
        Claims claims = parseClaims(token);
        if (claims.getId() != null) {
            return claims.getId();
        }
        return hashToken(token);
    }

    public Instant getExpiration(String token) {
        return parseClaims(token).getExpiration().toInstant();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public boolean isRefreshToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return "refresh".equals(claims.get("type", String.class));
        } catch (Exception e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
