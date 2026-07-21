package com.sba.nutricanbe.payment.event;

import lombok.Getter;

import java.math.BigDecimal;

/**
 * Phát ra sau khi rút tiền khỏi ví thành công (đã commit) để gửi email thông báo cho người dùng.
 */
@Getter
public class WithdrawalCompletedEvent {

    private final String email;
    private final String fullName;
    private final BigDecimal amount;
    private final BigDecimal remainingBalance;
    private final String currency;
    private final String bankName;
    private final String bankAccountNumber;

    public WithdrawalCompletedEvent(String email, String fullName, BigDecimal amount,
                                    BigDecimal remainingBalance, String currency,
                                    String bankName, String bankAccountNumber) {
        this.email = email;
        this.fullName = fullName;
        this.amount = amount;
        this.remainingBalance = remainingBalance;
        this.currency = currency;
        this.bankName = bankName;
        this.bankAccountNumber = bankAccountNumber;
    }
}
