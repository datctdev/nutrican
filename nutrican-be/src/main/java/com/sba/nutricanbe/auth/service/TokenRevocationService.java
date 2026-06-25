package com.sba.nutricanbe.auth.service;

public interface TokenRevocationService {
    boolean revoke(String token);
    boolean isRevoked(String token);
    void purgeExpiredTokens();
}
