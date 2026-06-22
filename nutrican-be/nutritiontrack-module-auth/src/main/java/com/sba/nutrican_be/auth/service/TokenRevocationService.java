package com.sba.nutrican_be.auth.service;

public interface TokenRevocationService {
    boolean revoke(String token);
    boolean isRevoked(String token);
    void purgeExpiredTokens();
}
