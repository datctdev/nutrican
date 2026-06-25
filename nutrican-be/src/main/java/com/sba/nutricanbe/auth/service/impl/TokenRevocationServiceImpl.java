package com.sba.nutricanbe.auth.service.impl;

import com.sba.nutricanbe.auth.service.TokenRevocationService;

import com.sba.nutricanbe.auth.entity.RevokedToken;
import com.sba.nutricanbe.auth.repository.RevokedTokenRepository;
import com.sba.nutricanbe.common.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevocationServiceImpl implements TokenRevocationService {

    private final RevokedTokenRepository revokedTokenRepository;
    private final JwtUtil jwtUtil;

    @Transactional
    @Override
    public boolean revoke(String token) {
        if (!StringUtils.hasText(token) || !jwtUtil.validateToken(token)) {
            return false;
        }

        String tokenId = jwtUtil.getTokenId(token);
        if (revokedTokenRepository.existsById(tokenId)) {
            return false;
        }

        LocalDateTime expiresAt = jwtUtil.getExpiration(token)
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();

        revokedTokenRepository.save(RevokedToken.builder()
                .tokenId(tokenId)
                .expiresAt(expiresAt)
                .build());

        log.debug("Token revoked: tokenId={}, expiresAt={}", tokenId, expiresAt);
        return true;
    }

    @Transactional(readOnly = true)
    @Override
    public boolean isRevoked(String token) {
        if (!jwtUtil.validateToken(token)) {
            return true;
        }
        return revokedTokenRepository.existsById(jwtUtil.getTokenId(token));
    }

    @Scheduled(cron = "${app.security.token-revocation.purge-cron:0 0 3 * * ?}")
    @Transactional
    @Override
    public void purgeExpiredTokens() {
        int deleted = revokedTokenRepository.deleteExpired(LocalDateTime.now());
        if (deleted > 0) {
            log.info("Purged {} expired revoked tokens from database", deleted);
        }
    }
}

