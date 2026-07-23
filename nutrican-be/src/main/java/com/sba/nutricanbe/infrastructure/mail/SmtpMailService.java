package com.sba.nutricanbe.infrastructure.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;


@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${spring.mail.username:noreply@nutrican.vn}")
    private String fromEmail;

    private static final String RESET_TEMPLATE = "password-reset-email";
    private static final String VERIFY_TEMPLATE = "email-verification";
    private static final int TOKEN_EXPIRY_MINUTES = 15;

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        try {
            Context context = new Context();
            String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
            context.setVariable("resetLink", resetLink);
            context.setVariable("expiresIn", TOKEN_EXPIRY_MINUTES);
            context.setVariable("fullName", "");
            context.setVariable("frontendUrl", frontendUrl);

            String htmlContent = templateEngine.process(RESET_TEMPLATE, context);

            var mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Dat lai mat khau NutriCan PT");
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Password reset email sent to: {}", maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", maskEmail(toEmail), e.getMessage());
        }
    }

    @Override
    public void sendEmailVerificationEmail(String toEmail, String verificationToken, int expiresInHours) {
        try {
            Context context = new Context();
            String verifyLink = frontendUrl + "/verify-email?token=" + verificationToken;
            context.setVariable("verifyLink", verifyLink);
            context.setVariable("expiresIn", expiresInHours);
            context.setVariable("fullName", "");
            context.setVariable("frontendUrl", frontendUrl);

            String htmlContent = templateEngine.process(VERIFY_TEMPLATE, context);

            var mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Xac nhan email NutriCan PT");
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Email verification sent to: {}", maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", maskEmail(toEmail), e.getMessage());
        }
    }

    @Override
    public void sendNotificationEmail(String toEmail, String fullName, String title, String body, String templateName) {
        try {
            Context context = new Context();
            context.setVariable("fullName", fullName != null ? fullName : "");
            context.setVariable("title", title);
            context.setVariable("body", body);
            context.setVariable("frontendUrl", frontendUrl);
            String template = templateName != null ? templateName : "generic-notification";
            String htmlContent = templateEngine.process(template, context);

            var mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(title != null ? title : "NutriCan PT");
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            log.info("Notification email sent to: {}", maskEmail(toEmail));
        } catch (Exception e) {
            log.warn("Failed to send notification email to {}: {}", maskEmail(toEmail), e.getMessage());
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf("@");
        String local = email.substring(0, at);
        String masked = local.substring(0, Math.min(2, local.length())) + "***";
        return masked + email.substring(at);
    }
}
