package com.sba.nutricanbe.infrastructure.mail;


public interface MailService {


    void sendPasswordResetEmail(String toEmail, String resetToken);

    void sendEmailVerificationEmail(String toEmail, String verificationToken, int expiresInHours);

    void sendNotificationEmail(String toEmail, String fullName, String title, String body, String templateName);
}
