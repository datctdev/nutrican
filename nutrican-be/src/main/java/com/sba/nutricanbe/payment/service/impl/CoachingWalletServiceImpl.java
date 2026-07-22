package com.sba.nutricanbe.payment.service.impl;

import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
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
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.payment.platform-fee-rate:10.00}")
    private BigDecimal platformFeeRate;

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

        if (platformFeeRate.signum() < 0 || platformFeeRate.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Platform fee rate must be between 0 and 100");
        }
        BigDecimal amount = payment.getAmount();
        BigDecimal fee = amount.multiply(platformFeeRate)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        CoachingEscrow escrow = escrowRepository.save(CoachingEscrow.builder()
                .mappingId(mapping.getId())
                .payment(payment)
                .customerWallet(customerWallet)
                .ptWallet(ptWallet)
                .escrowWallet(escrowWallet)
                .amount(amount)
                .platformFeeRate(platformFeeRate)
                .platformFeeAmount(fee)
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

        if (platformFeeRate.signum() < 0 || platformFeeRate.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Platform fee rate must be between 0 and 100");
        }
        BigDecimal amount = payment.getAmount();
        BigDecimal fee = amount.multiply(platformFeeRate)
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        CoachingEscrow escrow = escrowRepository.save(CoachingEscrow.builder()
                .mappingId(mapping.getId())
                .payment(payment)
                .customerWallet(customerWallet)
                .ptWallet(ptWallet)
                .escrowWallet(escrowWallet)
                .amount(amount)
                .platformFeeRate(platformFeeRate)
                .platformFeeAmount(fee)
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
    public void releaseEscrow(UUID mappingId) {
        CoachingEscrow escrow = escrowRepository.findByMappingIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("Coaching escrow", mappingId));
        releaseLockedEscrow(escrow);
    }

    @Override
    @Transactional
    public boolean releaseEscrowIfPresent(UUID mappingId) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    releaseLockedEscrow(escrow);
                    return true;
                })
                .orElse(false);
    }

    private void releaseLockedEscrow(CoachingEscrow escrow) {
        if (escrow.getStatus() == CoachingEscrowStatus.RELEASED) {
            return;
        }
        if (escrow.getStatus() != CoachingEscrowStatus.HELD) {
            throw new BadRequestException("Escrow cannot be released in status " + escrow.getStatus());
        }
        PtClientMapping mapping = mappingRepository.findById(escrow.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", escrow.getMappingId()));
        ClientMappingStatus mappingStatus = mapping.getStatus();
        if (mappingStatus != ClientMappingStatus.COMPLETED) {
            throw new BadRequestException("Coaching must be confirmed as ended before escrow release");
        }

        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);
        Wallet platformWallet = getOrCreateSystemWalletForUpdate(WalletType.PLATFORM);
        Wallet ptWallet = getOrCreateUserWalletForUpdate(mapping.getPt());

        BigDecimal amount = escrow.getAmount();
        BigDecimal fee = escrow.getPlatformFeeAmount();
        BigDecimal ptNet = amount.subtract(fee);
        if (ptNet.signum() < 0) {
            throw new BadRequestException("Platform fee exceeds escrow amount");
        }
        try {
            escrowWallet.subtractLocked(amount);
        } catch (IllegalStateException exception) {
            throw new BadRequestException(exception.getMessage());
        }
        ptWallet.addAvailable(ptNet);
        platformWallet.addAvailable(fee);

        String releaseDedupe = "COACHING_ESCROW_RELEASE:" + escrow.getId();
        if (!transactionRepository.existsByDedupeKey(releaseDedupe)) {
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(escrowWallet)
                    .toWallet(ptWallet)
                    .amount(ptNet)
                    .type(WalletTransactionType.RELEASE)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(releaseDedupe)
                    .referenceType("COACHING_ESCROW")
                    .referenceId(escrow.getId())
                    .note("Release completed coaching fee to PT")
                    .build());
        }

        String feeDedupe = "COACHING_COMMISSION:" + escrow.getId();
        if (fee.signum() > 0 && !transactionRepository.existsByDedupeKey(feeDedupe)) {
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(escrowWallet)
                    .toWallet(platformWallet)
                    .amount(fee)
                    .type(WalletTransactionType.COMMISSION)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(feeDedupe)
                    .referenceType("COACHING_ESCROW")
                    .referenceId(escrow.getId())
                    .note("Nutrican platform coaching commission")
                    .build());
        }

        walletRepository.saveAll(List.of(escrowWallet, platformWallet, ptWallet));
        escrow.setStatus(CoachingEscrowStatus.RELEASED);
        escrow.setReleasedAt(LocalDateTime.now());
        escrowRepository.save(escrow);
    }

    @Override
    @Transactional
    public boolean refundEscrowIfPresent(UUID mappingId) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    refundLockedEscrow(escrow);
                    return true;
                })
                .orElse(false);
    }

    @Override
    @Transactional
    public boolean markEscrowDisputedIfPresent(UUID mappingId) {
        return escrowRepository.findByMappingIdForUpdate(mappingId)
                .map(escrow -> {
                    if (escrow.getStatus() == CoachingEscrowStatus.HELD) {
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
                        escrow.setStatus(CoachingEscrowStatus.HELD);
                        escrowRepository.save(escrow);
                    } else if (escrow.getStatus() != CoachingEscrowStatus.HELD) {
                        throw new BadRequestException(
                                "Escrow dispute cannot be rejected in status "
                                        + escrow.getStatus());
                    }
                    return true;
                })
                .orElse(false);
    }

    private void refundLockedEscrow(CoachingEscrow escrow) {
        if (escrow.getStatus() == CoachingEscrowStatus.REFUNDED) {
            return;
        }
        if (escrow.getStatus() != CoachingEscrowStatus.HELD
                && escrow.getStatus() != CoachingEscrowStatus.DISPUTED) {
            throw new BadRequestException("Only held or disputed escrow can be refunded");
        }

        Wallet escrowWallet = getOrCreateSystemWalletForUpdate(WalletType.ESCROW);
        PtClientMapping mapping = mappingRepository.findById(escrow.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", escrow.getMappingId()));
        Wallet customerWallet = getOrCreateUserWalletForUpdate(mapping.getClient());
        BigDecimal amount = escrow.getAmount();
        try {
            escrowWallet.subtractLocked(amount);
        } catch (IllegalStateException exception) {
            throw new BadRequestException(exception.getMessage());
        }
        customerWallet.addAvailable(amount);

        String refundDedupe = "COACHING_ESCROW_REFUND:" + escrow.getId();
        if (!transactionRepository.existsByDedupeKey(refundDedupe)) {
            transactionRepository.save(WalletTransaction.builder()
                    .fromWallet(escrowWallet)
                    .toWallet(customerWallet)
                    .amount(amount)
                    .type(WalletTransactionType.REFUND)
                    .status(WalletTransactionStatus.SUCCESS)
                    .dedupeKey(refundDedupe)
                    .referenceType("COACHING_ESCROW")
                    .referenceId(escrow.getId())
                    .note("Refund held coaching fee to customer wallet")
                    .build());
        }

        walletRepository.saveAll(List.of(escrowWallet, customerWallet));
        escrow.setStatus(CoachingEscrowStatus.REFUNDED);
        escrowRepository.save(escrow);
        escrow.getPayment().setStatus(CoachingPaymentStatus.REFUNDED);
        paymentRepository.save(escrow.getPayment());
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
