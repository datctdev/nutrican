package com.sba.nutricanbe.payment.service.impl;

import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.service.SystemSettingService;
import com.sba.nutricanbe.payment.dto.WalletResponse;
import com.sba.nutricanbe.payment.dto.WalletTransactionResponse;
import com.sba.nutricanbe.payment.dto.WithdrawRequest;
import com.sba.nutricanbe.payment.entity.*;
import com.sba.nutricanbe.payment.event.WithdrawalCompletedEvent;
import com.sba.nutricanbe.payment.enums.*;
import com.sba.nutricanbe.payment.repository.CoachingEscrowRepository;
import com.sba.nutricanbe.payment.repository.CoachingPaymentRepository;
import com.sba.nutricanbe.payment.repository.WalletRepository;
import com.sba.nutricanbe.payment.repository.WalletTransactionRepository;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachingWalletServiceImpl implements CoachingWalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;
    private final CoachingEscrowRepository escrowRepository;
    private final CoachingPaymentRepository paymentRepository;
    private final PtClientMappingRepository mappingRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SystemSettingService systemSettingService;

    @Override
    @Transactional
    public void holdSuccessfulPayment(Payment payment) {
        PtClientMapping mapping = mappingRepository.findById(payment.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", payment.getMappingId()));
        if (escrowRepository.findByMappingId(mapping.getId()).isPresent()) {
            return;
        }

        Wallet customerWallet = getOrCreateUserWalletForUpdate(mapping.getClient());
        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);
        Wallet ptWallet = getOrCreateUserWalletForUpdate(mapping.getPt());

        BigDecimal feeRate = resolveFeeRate();
        BigDecimal amount = payment.getAmount();
        CoachingEscrow escrow = escrowRepository.save(CoachingEscrow.builder()
                .mappingId(mapping.getId())
                .payment(payment)
                .customerWallet(customerWallet)
                .ptWallet(ptWallet)
                .escrowWallet(escrowWallet)
                .amount(amount)
                .remainingAmount(amount)
                .platformFeeRate(feeRate)
                .platformFeeAmount(BigDecimal.ZERO)
                .status(CoachingEscrowStatus.HELD)
                .build());

        String paymentDedupe = "COACHING_PAYMENT:" + payment.getId();
        if (!transactionRepository.existsByDedupeKey(paymentDedupe)) {
            customerWallet.addAvailable(amount);
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(null)
                    .toWallet(customerWallet)
                    .amount(amount)
                    .type(WalletTransactionType.PAYMENT)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(paymentDedupe)
                    .referenceType("COACHING_PAYMENT")
                    .referenceId(payment.getId())
                    .providerTxnNo(payment.getProviderTxnNo())
                    .note("VNPay coaching payment received")
                    .build());
        }

        String holdDedupe = "COACHING_ESCROW_HOLD:" + escrow.getId();
        if (!transactionRepository.existsByDedupeKey(holdDedupe)) {
            try {
                customerWallet.subtractAvailable(amount);
            } catch (IllegalStateException exception) {
                throw new BadRequestException(exception.getMessage());
            }
            escrowWallet.addLocked(amount);
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(customerWallet)
                    .toWallet(escrowWallet)
                    .amount(amount)
                    .type(WalletTransactionType.HOLD)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(holdDedupe)
                    .referenceType("COACHING_ESCROW")
                    .referenceId(escrow.getId())
                    .note("Hold coaching fee until coaching is completed")
                    .build());
        }

        walletRepository.saveAll(List.of(customerWallet, ptWallet, escrowWallet));
    }

    @Override
    @Transactional
    public void holdFromWalletBalance(Payment payment) {
        PtClientMapping mapping = mappingRepository.findById(payment.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", payment.getMappingId()));
        if (escrowRepository.findByMappingId(mapping.getId()).isPresent()) {
            return;
        }

        Wallet customerWallet = getOrCreateUserWalletForUpdate(mapping.getClient());
        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);
        Wallet ptWallet = getOrCreateUserWalletForUpdate(mapping.getPt());

        BigDecimal feeRate = resolveFeeRate();
        BigDecimal amount = payment.getAmount();
        CoachingEscrow escrow = escrowRepository.save(CoachingEscrow.builder()
                .mappingId(mapping.getId())
                .payment(payment)
                .customerWallet(customerWallet)
                .ptWallet(ptWallet)
                .escrowWallet(escrowWallet)
                .amount(amount)
                .remainingAmount(amount)
                .platformFeeRate(feeRate)
                .platformFeeAmount(BigDecimal.ZERO)
                .status(CoachingEscrowStatus.HELD)
                .build());

        String holdDedupe = "COACHING_ESCROW_HOLD:" + escrow.getId();
        if (!transactionRepository.existsByDedupeKey(holdDedupe)) {
            try {
                customerWallet.subtractAvailable(amount);
            } catch (IllegalStateException exception) {
                throw new BadRequestException("Số dư ví không đủ để thanh toán");
            }
            escrowWallet.addLocked(amount);
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(customerWallet)
                    .toWallet(escrowWallet)
                    .amount(amount)
                    .type(WalletTransactionType.HOLD)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(holdDedupe)
                    .referenceType("COACHING_ESCROW")
                    .referenceId(escrow.getId())
                    .note("Thanh toán coaching bằng số dư ví (giữ trong escrow)")
                    .build());
        }

        walletRepository.saveAll(List.of(customerWallet, ptWallet, escrowWallet));
    }

    @Override
    @Transactional
    public void topUpEscrowFromVnPay(Payment payment) {
        topUpEscrowInternal(payment, true);
    }

    @Override
    @Transactional
    public void topUpEscrowFromWallet(Payment payment) {
        topUpEscrowInternal(payment, false);
    }

    private void topUpEscrowInternal(Payment payment, boolean creditFromVnPay) {
        PtClientMapping mapping = mappingRepository.findById(payment.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", payment.getMappingId()));
        CoachingEscrow escrow = escrowRepository.findByMappingIdForUpdate(mapping.getId())
                .orElseThrow(() -> new BadRequestException(
                        "Cannot top up: coaching escrow does not exist for this mapping"));

        if (escrow.getStatus() == CoachingEscrowStatus.DISPUTED) {
            throw new BadRequestException("Cannot top up escrow while disputed");
        }

        BigDecimal amount = payment.getAmount();
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException("Top-up amount must be greater than 0");
        }

        Wallet customerWallet = getOrCreateUserWalletForUpdate(mapping.getClient());
        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);

        if (creditFromVnPay) {
            String paymentDedupe = "COACHING_PAYMENT:" + payment.getId();
            if (!transactionRepository.existsByDedupeKey(paymentDedupe)) {
                customerWallet.addAvailable(amount);
                transactionRepository.save(WalletTransaction.builder()
                        .fromWallet(null)
                        .toWallet(customerWallet)
                        .amount(amount)
                        .type(WalletTransactionType.PAYMENT)
                        .status(WalletTransactionStatus.SUCCESS)
                        .dedupeKey(paymentDedupe)
                        .referenceType("COACHING_PAYMENT")
                        .referenceId(payment.getId())
                        .providerTxnNo(payment.getProviderTxnNo())
                        .note("VNPay extra sessions payment received")
                        .build());
            }
        }

        String holdDedupe = "COACHING_ESCROW_TOPUP:" + payment.getId();
        if (!transactionRepository.existsByDedupeKey(holdDedupe)) {
            try {
                customerWallet.subtractAvailable(amount);
            } catch (IllegalStateException exception) {
                throw new BadRequestException(creditFromVnPay
                        ? exception.getMessage()
                        : "Số dư ví không đủ để thanh toán buổi thêm");
            }
            escrowWallet.addLocked(amount);
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(customerWallet)
                    .toWallet(escrowWallet)
                    .amount(amount)
                    .type(WalletTransactionType.HOLD)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(holdDedupe)
                    .referenceType("COACHING_PAYMENT")
                    .referenceId(payment.getId())
                    .note("Top-up escrow for extra offline sessions")
                    .build());
        }

        escrow.setAmount(nullToZero(escrow.getAmount()).add(amount));
        escrow.setRemainingAmount(escrow.effectiveRemaining().add(amount));
        if (escrow.getStatus() == CoachingEscrowStatus.RELEASED
                || escrow.getStatus() == CoachingEscrowStatus.REFUNDED) {
            escrow.setStatus(CoachingEscrowStatus.HELD);
            escrow.setReleasedAt(null);
        } else if (escrow.getStatus() != CoachingEscrowStatus.HELD
                && escrow.getStatus() != CoachingEscrowStatus.PARTIALLY_RELEASED) {
            escrow.setStatus(CoachingEscrowStatus.HELD);
        } else if (escrow.effectiveRemaining().compareTo(escrow.getAmount()) < 0) {
            escrow.setStatus(CoachingEscrowStatus.PARTIALLY_RELEASED);
        }

        walletRepository.saveAll(List.of(customerWallet, escrowWallet));
        escrowRepository.save(escrow);
    }

    @Override
    @Transactional
    public void releaseEscrow(UUID mappingId) {
        CoachingEscrow escrow = escrowRepository.findByMappingIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching escrow", mappingId));
        BigDecimal remaining = escrow.effectiveRemaining();
        if (remaining.signum() <= 0) {
            return;
        }
        releaseToPtInternal(escrow, remaining, "COACHING_ESCROW", escrow.getId(),
                "Release remaining coaching fee to PT");
    }

    @Override
    @Transactional
    public boolean releaseEscrowIfPresent(UUID mappingId) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    BigDecimal remaining = escrow.effectiveRemaining();
                    if (remaining.signum() > 0
                            && (escrow.getStatus() == CoachingEscrowStatus.HELD
                            || escrow.getStatus() == CoachingEscrowStatus.PARTIALLY_RELEASED)) {
                        releaseToPtInternal(escrow, remaining, "COACHING_ESCROW", escrow.getId(),
                                "Release remaining coaching fee to PT");
                    }
                    return true;
                })
                .orElse(false);
    }

    @Override
    @Transactional
    public void releaseToPt(UUID mappingId, BigDecimal grossAmount, String referenceType,
                            UUID referenceId, String note) {
        CoachingEscrow escrow = escrowRepository.findByMappingIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching escrow", mappingId));
        releaseToPtInternal(escrow, grossAmount, referenceType, referenceId, note);
    }

    @Override
    @Transactional
    public void refundToCustomer(UUID mappingId, BigDecimal grossAmount, String referenceType,
                                 UUID referenceId, String note) {
        CoachingEscrow escrow = escrowRepository.findByMappingIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching escrow", mappingId));
        refundToCustomerInternal(escrow, grossAmount, referenceType, referenceId, note);
    }

    @Override
    @Transactional
    public void settleSplit(UUID mappingId, BigDecimal ptGross, BigDecimal customerGross,
                            String referenceType, UUID referenceId, String note) {
        CoachingEscrow escrow = escrowRepository.findByMappingIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching escrow", mappingId));
        BigDecimal pt = nullToZero(ptGross);
        BigDecimal customer = nullToZero(customerGross);
        if (pt.signum() < 0 || customer.signum() < 0) {
            throw new BadRequestException("Settlement amounts must be non-negative");
        }
        BigDecimal total = pt.add(customer);
        BigDecimal remaining = escrow.effectiveRemaining();
        if (total.compareTo(remaining) > 0) {
            throw new BadRequestException("Settlement exceeds remaining escrow");
        }
        if (pt.signum() > 0) {
            releaseToPtInternal(escrow, pt, referenceType, referenceId,
                    note != null ? note + " (PT share)" : "Settle PT share");
        }
        // reload remaining after PT release
        escrow = escrowRepository.findByMappingIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching escrow", mappingId));
        if (customer.signum() > 0) {
            refundToCustomerInternal(escrow, customer, referenceType, referenceId,
                    note != null ? note + " (customer share)" : "Settle customer share");
        }
    }

    @Override
    @Transactional
    public boolean refundRemainingIfPresent(UUID mappingId, String note) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    BigDecimal remaining = escrow.effectiveRemaining();
                    if (remaining.signum() > 0) {
                        refundToCustomerInternal(escrow, remaining, "COACHING_ESCROW", escrow.getId(),
                                note != null ? note : "Refund remaining escrow to customer");
                    }
                    return true;
                })
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getRemainingEscrow(UUID mappingId) {
        return escrowRepository.findByMappingId(mappingId)
                .map(CoachingEscrow::effectiveRemaining)
                .orElse(BigDecimal.ZERO);
    }

    private void releaseToPtInternal(CoachingEscrow escrow, BigDecimal grossAmount,
                                     String referenceType, UUID referenceId, String note) {
        assertEscrowPayable(escrow);
        BigDecimal gross = requirePositive(grossAmount, "Release amount");
        BigDecimal remaining = escrow.effectiveRemaining();
        if (gross.compareTo(remaining) > 0) {
            throw new BadRequestException("Release amount exceeds remaining escrow");
        }

        PtClientMapping mapping = mappingRepository.findById(escrow.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", escrow.getMappingId()));

        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);
        Wallet platformWallet = getOrCreateSystemWalletForUpdate(WalletType.PLATFORM);
        Wallet ptWallet = getOrCreateUserWalletForUpdate(mapping.getPt());

        BigDecimal feeRate = escrow.getPlatformFeeRate() != null
                ? escrow.getPlatformFeeRate() : resolveFeeRate();
        BigDecimal fee = computeFee(gross, feeRate);
        BigDecimal ptNet = gross.subtract(fee);
        if (ptNet.signum() < 0) {
            throw new BadRequestException("Platform fee exceeds release amount");
        }

        String releaseDedupe = "RELEASE:" + referenceType + ":" + referenceId + ":" + gross.toPlainString();
        if (transactionRepository.existsByDedupeKey(releaseDedupe)) {
            return;
        }

        try {
            escrowWallet.subtractLocked(gross);
        } catch (IllegalStateException exception) {
            throw new BadRequestException(exception.getMessage());
        }
        ptWallet.addAvailable(ptNet);
        if (fee.signum() > 0) {
            platformWallet.addAvailable(fee);
        }

        transactionRepository.save(WalletTransaction.builder()
                .fromWallet(escrowWallet)
                .toWallet(ptWallet)
                .amount(ptNet)
                .type(WalletTransactionType.RELEASE)
                .status(WalletTransactionStatus.SUCCESS)
                .dedupeKey(releaseDedupe)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(note != null ? note : "Release to PT")
                .build());

        if (fee.signum() > 0) {
            String feeDedupe = "COMMISSION:" + referenceType + ":" + referenceId + ":" + fee.toPlainString();
            if (!transactionRepository.existsByDedupeKey(feeDedupe)) {
                transactionRepository.save(WalletTransaction.builder()
                        .fromWallet(escrowWallet)
                        .toWallet(platformWallet)
                        .amount(fee)
                        .type(WalletTransactionType.COMMISSION)
                        .status(WalletTransactionStatus.SUCCESS)
                        .dedupeKey(feeDedupe)
                        .referenceType(referenceType)
                        .referenceId(referenceId)
                        .note("Platform commission on PT share")
                        .build());
            }
        }

        walletRepository.saveAll(List.of(escrowWallet, platformWallet, ptWallet));
        BigDecimal newRemaining = remaining.subtract(gross);
        escrow.setRemainingAmount(newRemaining);
        escrow.setPlatformFeeAmount(nullToZero(escrow.getPlatformFeeAmount()).add(fee));
        updateEscrowStatusAfterOutflow(escrow, newRemaining, false);
        escrowRepository.save(escrow);
    }

    private void refundToCustomerInternal(CoachingEscrow escrow, BigDecimal grossAmount,
                                          String referenceType, UUID referenceId, String note) {
        if (escrow.getStatus() == CoachingEscrowStatus.REFUNDED
                && escrow.effectiveRemaining().signum() <= 0) {
            return;
        }
        if (escrow.getStatus() != CoachingEscrowStatus.HELD
                && escrow.getStatus() != CoachingEscrowStatus.PARTIALLY_RELEASED
                && escrow.getStatus() != CoachingEscrowStatus.DISPUTED) {
            throw new BadRequestException("Escrow cannot be refunded in status " + escrow.getStatus());
        }

        BigDecimal gross = requirePositive(grossAmount, "Refund amount");
        BigDecimal remaining = escrow.effectiveRemaining();
        if (gross.compareTo(remaining) > 0) {
            throw new BadRequestException("Refund amount exceeds remaining escrow");
        }

        String refundDedupe = "REFUND:" + referenceType + ":" + referenceId + ":" + gross.toPlainString();
        if (transactionRepository.existsByDedupeKey(refundDedupe)) {
            return;
        }

        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);
        PtClientMapping mapping = mappingRepository.findById(escrow.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", escrow.getMappingId()));
        Wallet customerWallet = getOrCreateUserWalletForUpdate(mapping.getClient());

        try {
            escrowWallet.subtractLocked(gross);
        } catch (IllegalStateException exception) {
            throw new BadRequestException(exception.getMessage());
        }
        customerWallet.addAvailable(gross);

        transactionRepository.save(WalletTransaction.builder()
                .fromWallet(escrowWallet)
                .toWallet(customerWallet)
                .amount(gross)
                .type(WalletTransactionType.REFUND)
                .status(WalletTransactionStatus.SUCCESS)
                .dedupeKey(refundDedupe)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(note != null ? note : "Refund to customer")
                .build());

        walletRepository.saveAll(List.of(escrowWallet, customerWallet));
        BigDecimal newRemaining = remaining.subtract(gross);
        escrow.setRemainingAmount(newRemaining);
        updateEscrowStatusAfterOutflow(escrow, newRemaining, true);
        escrowRepository.save(escrow);

        if (escrow.getStatus() == CoachingEscrowStatus.REFUNDED) {
            escrow.getPayment().setStatus(CoachingPaymentStatus.REFUNDED);
            paymentRepository.save(escrow.getPayment());
        }
    }

    private void updateEscrowStatusAfterOutflow(CoachingEscrow escrow, BigDecimal newRemaining,
                                                boolean lastOpWasRefund) {
        if (newRemaining.signum() > 0) {
            escrow.setStatus(CoachingEscrowStatus.PARTIALLY_RELEASED);
            return;
        }
        boolean anyCommission = nullToZero(escrow.getPlatformFeeAmount()).signum() > 0;
        if (anyCommission || !lastOpWasRefund) {
            escrow.setStatus(CoachingEscrowStatus.RELEASED);
            escrow.setReleasedAt(LocalDateTime.now());
        } else {
            escrow.setStatus(CoachingEscrowStatus.REFUNDED);
        }
    }

    @Override
    @Transactional
    public boolean refundEscrowIfPresent(UUID mappingId) {
        return refundRemainingIfPresent(mappingId, "Refund held coaching fee to customer wallet");
    }

    @Override
    @Transactional
    public boolean markEscrowDisputedIfPresent(UUID mappingId) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    if (escrow.getStatus() == CoachingEscrowStatus.HELD
                            || escrow.getStatus() == CoachingEscrowStatus.PARTIALLY_RELEASED) {
                        escrow.setStatus(CoachingEscrowStatus.DISPUTED);
                        escrowRepository.save(escrow);
                    } else if (escrow.getStatus() != CoachingEscrowStatus.DISPUTED) {
                        throw new BadRequestException(
                                "Only held escrow can enter dispute review");
                    }
                    return true;
                })
                .orElse(false);
    }

    @Override
    @Transactional
    public boolean rejectEscrowDisputeIfPresent(UUID mappingId) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    if (escrow.getStatus() == CoachingEscrowStatus.DISPUTED) {
                        boolean partial = escrow.effectiveRemaining()
                                .compareTo(escrow.getAmount()) < 0;
                        escrow.setStatus(partial
                                ? CoachingEscrowStatus.PARTIALLY_RELEASED
                                : CoachingEscrowStatus.HELD);
                        escrowRepository.save(escrow);
                    } else if (escrow.getStatus() != CoachingEscrowStatus.HELD
                            && escrow.getStatus() != CoachingEscrowStatus.PARTIALLY_RELEASED) {
                        throw new BadRequestException(
                                "Escrow dispute cannot be rejected in status "
                                        + escrow.getStatus());
                    }
                    return true;
                })
                .orElse(false);
    }

    @Override
    @Transactional
    public WalletResponse getWallet(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return WalletResponse.from(getOrCreateUserWalletForUpdate(user));
    }

    @Override
    @Transactional
    public WalletResponse withdraw(UUID userId, WithdrawRequest request) {
        if (request == null || request.getAmount() == null
                || request.getAmount().signum() <= 0) {
            throw new BadRequestException("Số tiền rút phải lớn hơn 0");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Wallet wallet = getOrCreateUserWalletForUpdate(user);

        BigDecimal amount = request.getAmount();
        try {
            wallet.subtractAvailable(amount);
        } catch (IllegalStateException exception) {
            throw new BadRequestException("Số dư khả dụng không đủ để rút");
        }

        String bankName = request.getBankName().trim();
        String bankAccountNumber = request.getBankAccountNumber().trim();

        String dedupe = "WALLET_WITHDRAWAL:" + UUID.randomUUID();
        transactionRepository.save(WalletTransaction.builder()
                .fromWallet(wallet)
                .toWallet(null)
                .amount(amount)
                .type(WalletTransactionType.WITHDRAWAL)
                .status(WalletTransactionStatus.SUCCESS)
                .dedupeKey(dedupe)
                .referenceType("WALLET_WITHDRAWAL")
                .referenceId(user.getId())
                .note("Rút tiền về " + bankName + " - STK " + bankAccountNumber)
                .build());
        walletRepository.save(wallet);

        eventPublisher.publishEvent(new WithdrawalCompletedEvent(
                user.getEmail(),
                user.getFullName(),
                amount,
                wallet.getAvailableBalance(),
                wallet.getCurrency(),
                bankName,
                bankAccountNumber));

        return WalletResponse.from(wallet);
    }

    @Override
    @Transactional
    public WalletResponse getSystemWallet(WalletType type) {
        if (type == WalletType.USER) {
            throw new BadRequestException("USER is not a system wallet type");
        }
        return WalletResponse.from(getOrCreateSystemWalletForUpdate(type));
    }

    @Override
    @Transactional
    public PageResponse<WalletTransactionResponse> getTransactions(UUID userId, int page, int size) {
        validatePageRequest(page, size);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Wallet wallet = getOrCreateUserWalletForUpdate(user);
        Page<WalletTransaction> transactions = transactionRepository.findHistory(
                wallet.getId(), PageRequest.of(page, size));
        return PageResponse.from(transactions.map(item ->
                WalletTransactionResponse.from(item, wallet.getId())));
    }

    @Override
    @Transactional
    public PageResponse<WalletTransactionResponse> getSystemTransactions(
            WalletType type, int page, int size) {
        validatePageRequest(page, size);
        if (type == WalletType.USER) {
            throw new BadRequestException("USER is not a system wallet type");
        }
        Wallet wallet = getOrCreateSystemWalletForUpdate(type);
        Page<WalletTransaction> transactions = transactionRepository.findHistory(
                wallet.getId(), PageRequest.of(page, size));
        return PageResponse.from(transactions.map(item ->
                WalletTransactionResponse.from(item, wallet.getId())));
    }

    private void assertEscrowPayable(CoachingEscrow escrow) {
        if (escrow.getStatus() != CoachingEscrowStatus.HELD
                && escrow.getStatus() != CoachingEscrowStatus.PARTIALLY_RELEASED
                && escrow.getStatus() != CoachingEscrowStatus.DISPUTED) {
            throw new BadRequestException("Escrow cannot be released in status " + escrow.getStatus());
        }
    }

    private BigDecimal resolveFeeRate() {
        return systemSettingService.getPlatformFeeRate();
    }

    private BigDecimal computeFee(BigDecimal gross, BigDecimal feeRate) {
        return gross.multiply(feeRate)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal requirePositive(BigDecimal amount, String label) {
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException(label + " must be greater than 0");
        }
        return amount;
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private Wallet getOrCreateUserWalletForUpdate(User user) {
        return walletRepository.findUserWalletForUpdate(user.getId(), WalletType.USER)
                .orElseGet(() -> walletRepository.saveAndFlush(Wallet.builder()
                        .ownerId(user.getId())
                        .walletType(WalletType.USER)
                        .currency("VND")
                        .availableBalance(BigDecimal.ZERO)
                        .lockedBalance(BigDecimal.ZERO)
                        .build()));
    }

    private Wallet getOrCreateSystemWalletForUpdate(WalletType type) {
        return walletRepository.findSystemWalletForUpdate(type)
                .orElseGet(() -> walletRepository.saveAndFlush(Wallet.builder()
                        .ownerId(null)
                        .walletType(type)
                        .currency("VND")
                        .availableBalance(BigDecimal.ZERO)
                        .lockedBalance(BigDecimal.ZERO)
                        .build()));
    }

    private void validatePageRequest(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("Page must be >= 0 and size must be between 1 and 100");
        }
    }
}
