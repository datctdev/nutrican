package com.sba.nutrican_be.core.service;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String resetToken);
}
