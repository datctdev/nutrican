package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.payment.dto.ExtraSessionsPurchaseResponse;
import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.CoachingPaymentMethod;
import com.sba.nutricanbe.payment.enums.CoachingPaymentPurpose;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import com.sba.nutricanbe.payment.repository.CoachingPaymentRepository;
import com.sba.nutricanbe.payment.service.CoachingVnPayService;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.ExtraSessionsRequest;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowResponse;
import com.sba.nutricanbe.user.entity.ExtraSessionPurchase;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.ExtraSessionPurchaseStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.ExtraSessionPurchaseRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExtraSessionService {

    private static final DateTimeFormatter ORDER_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final PtClientMappingRepository mappingRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtVenueAvailabilityService venueAvailabilityService;
    private final OfflineHireSessionService offlineHireSessionService;
    private final OfflinePackageAppointmentService offlinePackageAppointmentService;
    private final SlotHoldService slotHoldService;
    private final ExtraSessionPurchaseRepository purchaseRepository;
    private final CoachingPaymentRepository paymentRepository;
    private final CoachingWalletService walletService;
    private final CoachingVnPayService vnPayService;

    @Transactional
    public ExtraSessionsPurchaseResponse purchase(
            UUID mappingId, UUID customerId, ExtraSessionsRequest request) {
        if (request == null || request.getSessionStarts() == null || request.getSessionStarts().isEmpty()) {
            throw new BadRequestException("Please select at least one session");
        }
        String method = request.getPayMethod() != null ? request.getPayMethod().trim().toUpperCase() : "WALLET";
        if (!"WALLET".equals(method) && !"VNPAY".equals(method)) {
            throw new BadRequestException("payMethod must be WALLET or VNPAY");
        }

        PtClientMapping mapping = mappingRepository.findByIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        validateActiveOffline(mapping, customerId);

        PtProfile profile = ptProfileRepository.findByUserId(mapping.getPt().getId())
                .orElseThrow(() -> new BadRequestException("PT profile not found"));
        List<PtAvailabilityWindowResponse> availability =
                venueAvailabilityService.listAvailabilityForProfile(profile.getId());

        OfflineHireSessionService.ValidatedOfflineHire validated =
                offlineHireSessionService.validateOfflineSessions(
                        mapping.getPt().getId(),
                        profile.getId(),
                        availability,
                        mapping.getAgreedRateUnit(),
                        request.getSessionStarts(),
                        mapping.getId());

        BigDecimal perSession = mapping.getPerSessionAmount();
        if (perSession == null || perSession.signum() <= 0) {
            throw new BadRequestException("Mapping has no valid per-session amount");
        }
        BigDecimal amount = perSession.multiply(BigDecimal.valueOf(validated.sessionCount()));
        try {
            amount.setScale(0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new BadRequestException("VND amount must be a whole number");
        }
        if (amount.compareTo(new BigDecimal("9999999999")) > 0) {
            throw new BadRequestException("Amount exceeds VNPay supported limit");
        }

        cancelPendingExtraPurchases(mappingId);

        LocalDateTime now = LocalDateTime.now();
        Payment payment = paymentRepository.save(Payment.builder()
                .mappingId(mapping.getId())
                .method("WALLET".equals(method) ? CoachingPaymentMethod.WALLET : CoachingPaymentMethod.VNPAY)
                .purpose(CoachingPaymentPurpose.EXTRA_SESSIONS)
                .status("WALLET".equals(method) ? CoachingPaymentStatus.SUCCESS : CoachingPaymentStatus.PENDING)
                .amount(amount)
                .currency("VND")
                .orderNumber(generateOrderNumber(now))
                .txnRef(generateTxnRef(mappingId))
                .expiresAt("WALLET".equals(method) ? now : now.plusMinutes(30))
                .paidAt("WALLET".equals(method) ? now : null)
                .build());

        ExtraSessionPurchase purchase = purchaseRepository.save(ExtraSessionPurchase.builder()
                .mappingId(mapping.getId())
                .paymentId(payment.getId())
                .status(ExtraSessionPurchaseStatus.PENDING)
                .sessionStarts(new ArrayList<>(validated.slots().stream().map(s -> s[0]).toList()))
                .build());

        // Hold slots until payment succeeds / expires
        slotHoldService.createHolds(mapping.getPt().getId(), mapping.getId(), validated.slots());

        if ("WALLET".equals(method)) {
            walletService.topUpEscrowFromWallet(payment);
            fulfill(payment, mapping, purchase, validated);
            return ExtraSessionsPurchaseResponse.builder()
                    .paymentId(payment.getId())
                    .mappingId(mapping.getId())
                    .purchaseId(purchase.getId())
                    .orderNumber(payment.getOrderNumber())
                    .amount(amount)
                    .currency("VND")
                    .status(payment.getStatus().name())
                    .payMethod("WALLET")
                    .fulfilled(true)
                    .sessionCount(validated.sessionCount())
                    .message("Đã mua thêm buổi và nạp escrow thành công")
                    .build();
        }

        return ExtraSessionsPurchaseResponse.builder()
                .paymentId(payment.getId())
                .mappingId(mapping.getId())
                .purchaseId(purchase.getId())
                .orderNumber(payment.getOrderNumber())
                .amount(amount)
                .currency("VND")
                .status(payment.getStatus().name())
                .payMethod("VNPAY")
                .paymentUrl(vnPayService.buildPaymentUrl(payment))
                .fulfilled(false)
                .sessionCount(validated.sessionCount())
                .message("Chuyển hướng VNPay để thanh toán buổi thêm")
                .build();
    }

    @Transactional
    public void fulfillFromPayment(Payment payment, PtClientMapping mapping) {
        if (payment.getPurpose() != CoachingPaymentPurpose.EXTRA_SESSIONS) {
            return;
        }
        ExtraSessionPurchase purchase = purchaseRepository.findByPaymentId(payment.getId())
                .orElseThrow(() -> new BadRequestException("Extra session purchase not found for payment"));
        if (purchase.getStatus() == ExtraSessionPurchaseStatus.FULFILLED) {
            return;
        }

        PtProfile profile = ptProfileRepository.findByUserId(mapping.getPt().getId())
                .orElseThrow(() -> new BadRequestException("PT profile not found"));
        List<PtAvailabilityWindowResponse> availability =
                venueAvailabilityService.listAvailabilityForProfile(profile.getId());

        OfflineHireSessionService.ValidatedOfflineHire validated =
                offlineHireSessionService.validateOfflineSessions(
                        mapping.getPt().getId(),
                        profile.getId(),
                        availability,
                        mapping.getAgreedRateUnit(),
                        purchase.getSessionStarts(),
                        mapping.getId());

        walletService.topUpEscrowFromVnPay(payment);
        fulfill(payment, mapping, purchase, validated);
    }

    private void fulfill(
            Payment payment,
            PtClientMapping mapping,
            ExtraSessionPurchase purchase,
            OfflineHireSessionService.ValidatedOfflineHire validated) {

        appendSessionsOnly(mapping, validated);

        int added = validated.sessionCount();
        int currentCount = mapping.getSessionCount() != null ? mapping.getSessionCount() : 0;
        mapping.setSessionCount(currentCount + added);
        BigDecimal agreed = mapping.getAgreedAmount() != null ? mapping.getAgreedAmount() : BigDecimal.ZERO;
        mapping.setAgreedAmount(agreed.add(payment.getAmount()));
        mappingRepository.save(mapping);

        offlinePackageAppointmentService.materializeOfflinePackageIfNeeded(mapping);

        purchase.setStatus(ExtraSessionPurchaseStatus.FULFILLED);
        purchaseRepository.save(purchase);
        log.info("Fulfilled extra sessions purchase {} for mapping {} (+{} sessions)",
                purchase.getId(), mapping.getId(), added);
    }

    private void appendSessionsOnly(
            PtClientMapping mapping,
            OfflineHireSessionService.ValidatedOfflineHire validated) {
        // Use append that creates sessions; holds already exist from purchase()
        offlineHireSessionService.appendSessionsWithoutHolds(
                mapping.getId(),
                mapping.getVenueId(),
                mapping.getVenueName(),
                mapping.getVenueAddress(),
                mapping.getVenueMapsUrl(),
                validated);
    }

    private void cancelPendingExtraPurchases(UUID mappingId) {
        paymentRepository.findFirstByMappingIdAndPurposeAndStatusOrderByCreatedAtDesc(
                        mappingId, CoachingPaymentPurpose.EXTRA_SESSIONS, CoachingPaymentStatus.PENDING)
                .ifPresent(pending -> {
                    pending.setStatus(CoachingPaymentStatus.CANCELLED);
                    paymentRepository.save(pending);
                    purchaseRepository.findByPaymentId(pending.getId()).ifPresent(p -> {
                        p.setStatus(ExtraSessionPurchaseStatus.CANCELLED);
                        purchaseRepository.save(p);
                    });
                });
        // Release any ACTIVE holds for this mapping (pending extra only — hire already converted)
        slotHoldService.releaseByMapping(mappingId);
    }

    private void validateActiveOffline(PtClientMapping mapping, UUID customerId) {
        if (!mapping.getClient().getId().equals(customerId)) {
            throw new BadRequestException("You can only buy extra sessions for your own coaching");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE) {
            throw new BadRequestException("Extra sessions require an ACTIVE coaching relationship");
        }
        if (mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            throw new BadRequestException("Extra session purchase is only for offline coaching");
        }
        if (mapping.getPerSessionAmount() == null || mapping.getPerSessionAmount().signum() <= 0) {
            throw new BadRequestException("Offline package has no per-session price");
        }
    }

    private String generateTxnRef(UUID mappingId) {
        return "NX" + mappingId.toString().substring(0, 8).toUpperCase()
                + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 12).toUpperCase();
    }

    private String generateOrderNumber(LocalDateTime createdAt) {
        String date = createdAt.format(ORDER_DATE);
        String orderNumber = "EXTRA" + date
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        if (paymentRepository.existsByOrderNumber(orderNumber)) {
            orderNumber = "EXTRA" + date + System.currentTimeMillis()
                    + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        }
        return orderNumber;
    }
}
