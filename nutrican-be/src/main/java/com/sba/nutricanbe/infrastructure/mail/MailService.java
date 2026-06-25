package com.sba.nutricanbe.infrastructure.mail;

/**
 * Mail service abstraction — decouples business logic from SMTP/SES implementation details.
 */
public interface MailService {

    /**
     * Send a password reset email with a Thymeleaf-rendered HTML body.
     *
     * @param toEmail    recipient email address
     * @param resetToken the one-time reset token to embed in the link
     */
    void sendPasswordResetEmail(String toEmail, String resetToken);
}
