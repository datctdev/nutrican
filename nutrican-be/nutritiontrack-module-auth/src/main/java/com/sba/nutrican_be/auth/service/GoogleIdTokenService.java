package com.sba.nutrican_be.auth.service;

public interface GoogleIdTokenService {

    GoogleTokenPayload verify(String idToken);

    record GoogleTokenPayload(
            String email,
            String googleId,
            String name,
            String picture
    ) {}
}
