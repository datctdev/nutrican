package com.sba.nutricanbe.auth.service.impl;

import com.sba.nutricanbe.auth.service.GoogleIdTokenService;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseException;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.sba.nutricanbe.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Slf4j
@Service
public class GoogleIdTokenServiceImpl implements GoogleIdTokenService {

    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    private FirebaseAuth firebaseAuth;

    @PostConstruct
    public void init() {
        if (firebaseEnabled && !FirebaseApp.getApps().isEmpty()) {
            this.firebaseAuth = FirebaseAuth.getInstance();
        }
    }

    @Override
    public GoogleTokenPayload verify(String idToken) {
        if (!firebaseEnabled) {
            log.warn("Firebase is not enabled. Google authentication is unavailable.");
            throw new BadRequestException("Google authentication is currently unavailable. Please use email/password login.");
        }

        if (firebaseAuth == null) {
            log.error("FirebaseAuth is not initialized. Ensure Firebase is properly configured.");
            throw new BadRequestException("Google authentication is not properly configured on the server.");
        }

        try {
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(idToken);
            Boolean emailVerified = decodedToken.isEmailVerified();
            return new GoogleTokenPayload(
                    decodedToken.getEmail(),
                    decodedToken.getUid(),
                    decodedToken.getName(),
                    decodedToken.getPicture(),
                    Boolean.TRUE.equals(emailVerified)
            );
        } catch (FirebaseException e) {
            String fullMessage = e.getMessage();
            log.warn("Firebase token verification failed: {} - {}", e.getErrorCode(), fullMessage);
            throw new BadRequestException("Invalid Google ID token: " + getErrorMessage(e));
        } catch (Exception e) {
            log.error("Unexpected error during Google token verification: {}", e.getMessage());
            throw new BadRequestException("Google authentication failed. Please try again.");
        }
    }

    private String getErrorMessage(FirebaseException e) {
        String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        if (msg.contains("expired")) {
            return "Token has expired";
        }
        if (msg.contains("revoked")) {
            return "Token has been revoked";
        }
        if (msg.contains("invalid") || msg.contains("malformed")) {
            return "Token is invalid or malformed";
        }
        return "Token verification failed";
    }

    
}

