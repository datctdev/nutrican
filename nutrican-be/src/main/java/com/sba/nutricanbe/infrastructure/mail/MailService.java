package com.sba.nutricanbe.infrastructure.mail;

/**
 * Mail service abstraction — decouples business logic from SMTP/SES implementation details.
 */
public interface MailService {

    /**
     * Send a password reset email with a Thymeleaf-rendered HTML body.
     */
    void sendPasswordResetEmail(String toEmail, String resetToken);

    void sendNotificationEmail(String toEmail, String fullName, String title, String body, String templateName);
}
