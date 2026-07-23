package com.sba.nutricanbe.payment.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.payment.config.VNPayConfig;
import com.sba.nutricanbe.payment.dto.CoachingPaymentResult;
import com.sba.nutricanbe.payment.dto.CreateCoachingPaymentResponse;
import com.sba.nutricanbe.payment.dto.VnPayIpnResponse;
import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.CoachingPaymentMethod;
import com.sba.nutricanbe.payment.enums.CoachingPaymentPurpose;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import com.sba.nutricanbe.payment.repository.CoachingPaymentRepository;
import com.sba.nutricanbe.payment.service.CoachingPaymentService;
import com.sba.nutricanbe.payment.service.CoachingVnPayService;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.ExtraSessionPurchase;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.ExtraSessionPurchaseStatus;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.ExtraSessionPurchaseRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.service.ExtraSessionService;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.user.service.OfflinePackageAppointmentService;
import com.sba.nutricanbe.user.service.UserAccountStatusHelper;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CoachingPaymentServiceImpl implements CoachingPaymentService {

    private static final DateTimeFormatter ORDER_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private static final int PAYMENT_ATTEMPT_GRACE_MINUTES = 15;

    private final CoachingPaymentRepository paymentRepository;
    private final PtClientMappingRepository mappingRepository;
    private final CoachingVnPayService vnPayService;
    private final CoachingWalletService walletService;
    private final VNPayConfig vnPayProperties;
    private final NotificationService notificationService;
    private final WebSocketSessionService webSocketSessionService;
    private final OfflinePackageAppointmentService offlinePackageAppointmentService;
    private final ExtraSessionService extraSessionService;
    private final ExtraSessionPurchaseRepository extraSessionPurchaseRepository;

    @Override
    @Transactional
    public CreateCoachingPaymentResponse createVnPayPayment(
            UUID mappingId, UUID customerId) {
        PtClientMapping mapping = mappingRepository.findByIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        validatePayable(mapping, customerId);
        if (mapping.getAgreedAmount().compareTo(new BigDecimal("9999999999")) > 0) {
            throw new BadRequestException("The coaching price exceeds VNPay's supported amount");
        }

        LocalDateTime now = DietDates.nowVn();
        LocalDateTime attemptExpiresAt = now.plusMinutes(30);
        cancelPendingHirePayment(mappingId);
        Payment payment = paymentRepository.save(Payment.builder()
                .mappingId(mapping.getId())
                .method(CoachingPaymentMethod.VNPAY)
                .purpose(CoachingPaymentPurpose.HIRE)
                .status(CoachingPaymentStatus.PENDING)
                .amount(mapping.getAgreedAmount())
                .currency("VND")
                .orderNumber(generateOrderNumber(now))
                .txnRef(generateTxnRef(mappingId))
                .expiresAt(attemptExpiresAt)
                .build());

        return CreateCoachingPaymentResponse.builder()
                .paymentId(payment.getId())
                .mappingId(mappingId)
                .orderNumber(payment.getOrderNumber())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus().name())
                .paymentUrl(vnPayService.buildPaymentUrl(payment))
                .build();
    }

    @Override
    @Transactional
    public CoachingPaymentResult payWithWallet(UUID mappingId, UUID customerId) {
        PtClientMapping mapping = mappingRepository.findByIdForUpdate(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        validatePayable(mapping, customerId);

        LocalDateTime now = DietDates.nowVn();
        cancelPendingHirePayment(mappingId);
        Payment payment = paymentRepository.save(Payment.builder()
                .mappingId(mapping.getId())
                .method(CoachingPaymentMethod.WALLET)
                .purpose(CoachingPaymentPurpose.HIRE)
                .status(CoachingPaymentStatus.SUCCESS)
                .amount(mapping.getAgreedAmount())
                .currency("VND")
                .orderNumber(generateOrderNumber(now))
                .txnRef(generateTxnRef(mappingId))
                .expiresAt(now)
                .paidAt(now)
                .build());

        walletService.holdFromWalletBalance(payment);

        mapping.setStatus(ClientMappingStatus.ACTIVE);
        mapping.setCoachingStartedAt(now);
        mapping.setPaymentDueAt(null);
        applyOnlinePeriodEnd(mapping, now);
        mappingRepository.save(mapping);
        offlinePackageAppointmentService.materializeOfflinePackageIfNeeded(mapping);
        notifyPaymentSuccessAfterCommit(mapping, payment);
        return result(payment, mapping, true, "Coaching payment completed");
    }

    @Override
    @Transactional
    public CoachingPaymentResult processVnPayCallback(Map<String, String> params) {
        if (!vnPayService.verifyChecksumFromMap(params)) {
            throw new BadRequestException("Invalid VNPay checksum");
        }
        if (!vnPayProperties.getTmnCode().equals(params.get("vnp_TmnCode"))) {
            throw new BadRequestException("Invalid VNPay merchant code");
        }

        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            throw new BadRequestException("Missing VNPay transaction reference");
        }
        Payment paymentSnapshot = paymentRepository.findByTxnRef(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Coaching payment not found for transaction reference: " + txnRef));
        PtClientMapping mapping = mappingRepository.findByIdForUpdate(
                        paymentSnapshot.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PT-client mapping", paymentSnapshot.getMappingId()));
        Payment payment = paymentRepository.findByTxnRefForUpdate(txnRef)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Coaching payment not found for transaction reference: " + txnRef));

        if (payment.getStatus() == CoachingPaymentStatus.SUCCESS) {
            return result(payment, mapping, true, "Payment already processed");
        }
        if (payment.getStatus() == CoachingPaymentStatus.REFUNDED) {
            return result(payment, mapping, false, "Payment attempt is no longer pending");
        }

        BigDecimal callbackAmount;
        try {
            callbackAmount = new BigDecimal(params.get("vnp_Amount"))
                    .divide(BigDecimal.valueOf(100));
        } catch (RuntimeException exception) {
            throw new BadRequestException("Invalid VNPay amount");
        }
        if (callbackAmount.compareTo(payment.getAmount()) != 0) {
            throw new BadRequestException("VNPay amount does not match the coaching payment");
        }

        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");
        payment.setProviderResponseCode(responseCode);
        payment.setProviderTxnNo(params.get("vnp_TransactionNo"));
        boolean successful = "00".equals(responseCode)
                && (transactionStatus == null || "00".equals(transactionStatus));
        if (!successful) {
            if (payment.getStatus() == CoachingPaymentStatus.PENDING
                    || payment.getStatus() == CoachingPaymentStatus.CANCELLED) {
                payment.setStatus(CoachingPaymentStatus.FAILED);
            }
            paymentRepository.save(payment);
            return result(payment, mapping, false, failureMessage(responseCode));
        }

        CoachingPaymentPurpose purpose = payment.getPurpose() != null
                ? payment.getPurpose()
                : CoachingPaymentPurpose.HIRE;

        if (purpose == CoachingPaymentPurpose.EXTRA_SESSIONS) {
            return processExtraSessionsVnPaySuccess(payment, mapping);
        }
        return processHireVnPaySuccess(payment, mapping);
    }

    private CoachingPaymentResult processHireVnPaySuccess(Payment payment, PtClientMapping mapping) {
        if (payment.getStatus() != CoachingPaymentStatus.PENDING
                && payment.getStatus() != CoachingPaymentStatus.CANCELLED) {
            return result(payment, mapping, false, "Payment attempt is no longer payable");
        }

        // Late bank success after mapping expired / inactivated: credit wallet, do not activate.
        if (mapping.getStatus() != ClientMappingStatus.AWAITING_PAYMENT) {
            return refundOrphanVnPayToWallet(payment, mapping,
                    "Thanh toán VNPay đã được hoàn vào ví (yêu cầu coaching không còn chờ thanh toán).");
        }

        if (payment.getStatus() == CoachingPaymentStatus.CANCELLED
                || isAttemptExpiredBeyondGrace(payment)) {
            return refundOrphanVnPayToWallet(payment, mapping,
                    "Thanh toán VNPay đã được hoàn vào ví (phiên thanh toán đã hết hạn hoặc bị hủy).");
        }

        if (paymentRepository.existsByMappingIdAndPurposeAndStatus(
                mapping.getId(), CoachingPaymentPurpose.HIRE, CoachingPaymentStatus.SUCCESS)) {
            return refundOrphanVnPayToWallet(payment, mapping,
                    "Thanh toán VNPay đã được hoàn vào ví (coaching đã được thanh toán bởi giao dịch khác).");
        }

        payment.setStatus(CoachingPaymentStatus.SUCCESS);
        payment.setPaidAt(DietDates.nowVn());
        paymentRepository.save(payment);
        walletService.holdSuccessfulPayment(payment);

        mapping.setStatus(ClientMappingStatus.ACTIVE);
        mapping.setCoachingStartedAt(DietDates.nowVn());
        mapping.setPaymentDueAt(null);
        applyOnlinePeriodEnd(mapping, mapping.getCoachingStartedAt());
        mappingRepository.save(mapping);
        offlinePackageAppointmentService.materializeOfflinePackageIfNeeded(mapping);
        notifyPaymentSuccessAfterCommit(mapping, payment);
        return result(payment, mapping, true, "Coaching payment completed");
    }

    private CoachingPaymentResult processExtraSessionsVnPaySuccess(
            Payment payment, PtClientMapping mapping) {
        ExtraSessionPurchase purchase = extraSessionPurchaseRepository.findByPaymentId(payment.getId())
                .orElse(null);
        boolean purchaseOk = purchase != null
                && purchase.getStatus() != ExtraSessionPurchaseStatus.CANCELLED
                && purchase.getStatus() != ExtraSessionPurchaseStatus.FULFILLED;
        boolean fulfillable = payment.getStatus() == CoachingPaymentStatus.PENDING
                && mapping.getStatus() == ClientMappingStatus.ACTIVE
                && purchaseOk
                && !isAttemptExpiredBeyondGrace(payment);

        if (!fulfillable) {
            return refundOrphanVnPayToWallet(payment, mapping,
                    "Thanh toán buổi thêm VNPay đã được hoàn vào ví (không thể kích hoạt buổi thêm).");
        }

        payment.setStatus(CoachingPaymentStatus.SUCCESS);
        payment.setPaidAt(DietDates.nowVn());
        paymentRepository.save(payment);
        extraSessionService.fulfillFromPayment(payment, mapping);
        notifyPaymentSuccessAfterCommit(mapping, payment);
        return result(payment, mapping, true, "Extra sessions payment completed");
    }

    private CoachingPaymentResult refundOrphanVnPayToWallet(
            Payment payment, PtClientMapping mapping, String message) {
        walletService.creditVnPayToCustomerWallet(payment);
        payment.setStatus(CoachingPaymentStatus.REFUNDED);
        if (payment.getPaidAt() == null) {
            payment.setPaidAt(DietDates.nowVn());
        }
        paymentRepository.save(payment);
        notifyOrphanVnPayRefundAfterCommit(mapping, payment, message);
        // success=true so IPN acknowledges bank capture while customer is refunded to wallet
        return result(payment, mapping, true, message);
    }

    private void notifyOrphanVnPayRefundAfterCommit(
            PtClientMapping mapping, Payment payment, String message) {
        Runnable notification = () -> {
            try {
                NotificationPayload customerNotification = NotificationPayload.builder()
                        .type("COACHING_PAYMENT_REFUNDED_TO_WALLET")
                        .title("Thanh toán đã hoàn vào ví")
                        .body(message)
                        .linkType(NotificationLinkType.HIRE)
                        .linkRefId(mapping.getPt().getId())
                        .sendEmail(false)
                        .build();
                notificationService.notify(mapping.getClient().getId(), customerNotification);

                Map<String, Object> event = new HashMap<>();
                event.put("mappingId", mapping.getId());
                event.put("paymentId", payment.getId());
                event.put("paymentStatus", payment.getStatus().name());
                event.put("mappingStatus", mapping.getStatus().name());
                event.put("message", message);
                webSocketSessionService.sendToUserOnly(
                        mapping.getClient().getId(), "COACHING_PAYMENT_REFUNDED_TO_WALLET", event);
            } catch (RuntimeException exception) {
                log.warn("Payment {} wallet-credit refund notification failed",
                        payment.getId(), exception);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            notification.run();
                        }
                    });
        } else {
            notification.run();
        }
    }

    private void applyOnlinePeriodEnd(PtClientMapping mapping, LocalDateTime startedAt) {
        if (mapping.getSelectedTrainingMode() != TrainingMode.ONLINE || startedAt == null) {
            return;
        }
        String unit = mapping.getAgreedRateUnit() != null
                ? mapping.getAgreedRateUnit().trim().toUpperCase() : "";
        if ("WEEK".equals(unit)) {
            mapping.setPeriodEndsAt(startedAt.plusDays(7));
        } else {
            // MONTH and any other/unknown unit default to 1 month
            mapping.setPeriodEndsAt(startedAt.plusMonths(1));
        }
    }

    @Override
    @Transactional
    public VnPayIpnResponse processVnPayIpn(Map<String, String> params) {
        try {
            CoachingPaymentResult result = processVnPayCallback(params);
            if (result.isSuccess() && "Payment already processed".equals(result.getMessage())) {
                return VnPayIpnResponse.of("02", "Order already confirmed");
            }
            return VnPayIpnResponse.of("00", "Confirm Success");
        } catch (ResourceNotFoundException exception) {
            return VnPayIpnResponse.of("01", "Order not found");
        } catch (BadRequestException exception) {
            String message = exception.getMessage() == null ? "" : exception.getMessage();
            if (message.toLowerCase().contains("checksum") || message.toLowerCase().contains("merchant code")) {
                return VnPayIpnResponse.of("97", "Invalid Checksum");
            }
            // Business failure after bank success — non-00 so VNPay retries
            log.warn("VNPay IPN business reject: {}", message);
            return VnPayIpnResponse.of("99", "Confirm Failed");
        } catch (RuntimeException exception) {
            log.warn("VNPay IPN processing failed", exception);
            return VnPayIpnResponse.of("99", "Unknown error");
        }
    }

    private boolean isAttemptExpiredBeyondGrace(Payment payment) {
        if (payment.getExpiresAt() == null) {
            return false;
        }
        return payment.getExpiresAt()
                .plusMinutes(PAYMENT_ATTEMPT_GRACE_MINUTES)
                .isBefore(DietDates.nowVn());
    }

    private String failureMessage(String responseCode) {
        if ("24".equals(responseCode)) {
            return "Bạn đã hủy thanh toán. Có thể thử lại.";
        }
        return "VNPay payment was not successful";
    }

    private void notifyPaymentSuccessAfterCommit(PtClientMapping mapping, Payment payment) {
        Runnable notification = () -> {
            try {
                notifyPaymentSuccess(mapping, payment);
            } catch (RuntimeException exception) {
                log.warn("Payment {} succeeded but notification delivery failed",
                        payment.getId(), exception);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            notification.run();
                        }
                    });
        } else {
            notification.run();
        }
    }

    private void notifyPaymentSuccess(PtClientMapping mapping, Payment payment) {
        NotificationPayload customerNotification = NotificationPayload.builder()
                .type("COACHING_PAYMENT_SUCCESS")
                .title("Thanh toán coaching thành công")
                .body("Gói coaching đã được kích hoạt. Số tiền đang được Nutrican giữ an toàn.")
                .linkType(NotificationLinkType.HIRE)
                .linkRefId(mapping.getPt().getId())
                .sendEmail(false)
                .build();
        notificationService.notify(mapping.getClient().getId(), customerNotification);

        NotificationPayload ptNotification = NotificationPayload.builder()
                .type("COACHING_PAYMENT_RECEIVED")
                .title("Học viên đã thanh toán")
                .body(mapping.getClient().getFullName() + " đã thanh toán. Coaching đã được kích hoạt.")
                .linkType(NotificationLinkType.HIRE)
                .linkRefId(mapping.getClient().getId())
                .sendEmail(false)
                .build();
        notificationService.notify(mapping.getPt().getId(), ptNotification);

        Map<String, Object> event = new HashMap<>();
        event.put("mappingId", mapping.getId());
        event.put("paymentId", payment.getId());
        event.put("clientId", mapping.getClient().getId());
        event.put("ptId", mapping.getPt().getId());
        event.put("status", ClientMappingStatus.ACTIVE.name());
        webSocketSessionService.sendToUserOnly(
                mapping.getClient().getId(), "COACHING_PAYMENT_SUCCESS", event);
        webSocketSessionService.sendToUserOnly(
                mapping.getPt().getId(), "COACHING_PAYMENT_RECEIVED", event);
    }

    private CoachingPaymentResult result(
            Payment payment, PtClientMapping mapping, boolean success, String message) {
        return CoachingPaymentResult.builder()
                .paymentId(payment.getId())
                .mappingId(mapping.getId())
                .paymentStatus(payment.getStatus().name())
                .mappingStatus(mapping.getStatus().name())
                .success(success)
                .message(message)
                .build();
    }

    private void validatePayable(PtClientMapping mapping, UUID customerId) {
        if (!mapping.getClient().getId().equals(customerId)) {
            throw new BadRequestException("You can only pay for your own coaching request");
        }
        if (mapping.getStatus() != ClientMappingStatus.AWAITING_PAYMENT) {
            throw new BadRequestException("The coaching request is not awaiting payment");
        }
        if (UserAccountStatusHelper.isCurrentlySuspended(mapping.getPt())) {
            throw new BadRequestException("PT đang bị khóa tài khoản — không thể thanh toán coaching");
        }
        if (mapping.getPaymentDueAt() != null
                && mapping.getPaymentDueAt().isBefore(DietDates.nowVn())) {
            throw new BadRequestException("The payment window for this coaching request has expired");
        }
        if (mapping.getAgreedAmount() == null || mapping.getAgreedAmount().signum() <= 0) {
            throw new BadRequestException("The coaching request does not have a valid agreed amount");
        }
        try {
            mapping.getAgreedAmount().setScale(0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw new BadRequestException("VND coaching price must be a whole number");
        }
        if (paymentRepository.existsByMappingIdAndPurposeAndStatus(
                mapping.getId(), CoachingPaymentPurpose.HIRE, CoachingPaymentStatus.SUCCESS)) {
            throw new BadRequestException("This coaching request has already been paid");
        }
    }

    private void cancelPendingHirePayment(UUID mappingId) {
        paymentRepository
                .findFirstByMappingIdAndPurposeAndStatusOrderByCreatedAtDesc(
                        mappingId, CoachingPaymentPurpose.HIRE, CoachingPaymentStatus.PENDING)
                .ifPresent(pending -> {
                    pending.setStatus(CoachingPaymentStatus.CANCELLED);
                    paymentRepository.save(pending);
                });
    }

    private String generateTxnRef(UUID mappingId) {
        return "NC" + mappingId.toString().substring(0, 8).toUpperCase()
                + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 12).toUpperCase();
    }

    private String generateOrderNumber(LocalDateTime createdAt) {
        String date = createdAt.format(ORDER_DATE);
        String orderNumber = "COACH" + date
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        if (paymentRepository.existsByOrderNumber(orderNumber)) {
            orderNumber = "COACH" + date + System.currentTimeMillis()
                    + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        }
        return orderNumber;
    }
}
