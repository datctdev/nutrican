package com.sba.nutrican_be.auth.service;

import com.sba.nutrican_be.core.entity.RevokedToken;
import com.sba.nutrican_be.core.repository.RevokedTokenRepository;
import com.sba.nutrican_be.core.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class TokenRevocationService {

    private final RevokedTokenRepository revokedTokenRepository;
    private final JwtUtil jwtUtil;

    @Transactional
    public void revoke(String token) {
        if (!StringUtils.hasText(token) || !jwtUtil.validateToken(token)) {
            return;
        }

        String tokenId = jwtUtil.getTokenId(token);
        if (revokedTokenRepository.existsById(tokenId)) {
            return;
        }

        LocalDateTime expiresAt = jwtUtil.getExpiration(token)
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();

        revokedTokenRepository.save(RevokedToken.builder()
                .tokenId(tokenId)
                .expiresAt(expiresAt)
                .build());
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(String token) {
        if (!jwtUtil.validateToken(token)) {
            return true;
        }
        return revokedTokenRepository.existsById(jwtUtil.getTokenId(token));
    }

    @Transactional
    public void purgeExpiredTokens() {
        revokedTokenRepository.deleteExpired(LocalDateTime.now());
    }
}
