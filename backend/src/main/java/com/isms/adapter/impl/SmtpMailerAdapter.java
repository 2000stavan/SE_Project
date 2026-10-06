package com.isms.adapter.impl;

import com.isms.adapter.MailerAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpMailerAdapter implements MailerAdapter {

    private static final Logger log = LoggerFactory.getLogger(SmtpMailerAdapter.class);
    private final JavaMailSender mailSender;

    public SmtpMailerAdapter(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@isms.com");
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("[MAILER] Sent email to {} with subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("[MAILER] Failed to send email via SMTP to {}: {}. Logging body directly: {}", to, e.getMessage(), body);
        }
    }
}
