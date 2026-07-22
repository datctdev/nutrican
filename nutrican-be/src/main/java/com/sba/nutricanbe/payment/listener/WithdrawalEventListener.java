package com.sba.nutricanbe.payment.listener;

import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.payment.event.WithdrawalCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.text.NumberFormat;
import java.util.Locale;


@Slf4j
@Component
@RequiredArgsConstructor
public class WithdrawalEventListener {

    private final MailService mailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onWithdrawalCompleted(WithdrawalCompletedEvent event) {
        if (event.getEmail() == null || event.getEmail().isBlank()) {
            log.warn("Bỏ qua email rút tiền — người dùng chưa có email.");
            return;
        }
        NumberFormat vn = NumberFormat.getInstance(new Locale("vi", "VN"));
        String amount = vn.format(event.getAmount());
        String balance = vn.format(event.getRemainingBalance());
        String title = "Yêu cầu rút tiền thành công";
        String body = String.format(
                "Bạn vừa rút thành công %sđ từ ví NutriCan PT về %s - STK %s. "
                        + "Số dư khả dụng còn lại: %sđ.",
                amount,
                event.getBankName(),
                maskAccount(event.getBankAccountNumber()),
                balance);
        mailService.sendNotificationEmail(
                event.getEmail(), event.getFullName(), title, body, "generic-notification");
    }

    private static String maskAccount(String account) {
        if (account == null || account.length() < 4) {
            return "****";
        }
        return "****" + account.substring(account.length() - 4);
    }
}
