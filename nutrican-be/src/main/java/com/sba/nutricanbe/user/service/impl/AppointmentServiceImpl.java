package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.AppointmentActionRequest;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.dto.CancelAppointmentRequest;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

    private static final int CUSTOMER_NO_FEE_CANCEL_HOURS = 48;
    private static final int PENDING_EXPIRY_HOURS = 24;

    private final PtAppointmentRepository appointmentRepository;
    private final PtClientMappingRepository mappingRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final CoachingWalletService walletService;

    @Override
    @Transactional
    public PtAppointment book(UUID customerId, UUID ptId, BookAppointmentRequest request) {
        throw new BadRequestException(
                "Free appointment booking is disabled. For offline coaching, buy extra sessions from /coaching.");
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtAppointment> upcomingForCustomer(UUID customerId) {
        return appointmentRepository.findByClientIdAndStatusInOrderByStartTimeAsc(
                customerId, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));
    }

    @Override
    @Transactional
    public List<PtAppointment> upcomingForPt(UUID ptId) {
        expireStale();
        return appointmentRepository.findByPtIdAndStatusInOrderByStartTimeAsc(
                ptId, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));
    }

    @Override
    @Transactional
    public PtAppointment updateByPt(UUID ptId, UUID appointmentId, AppointmentActionRequest request) {
        PtAppointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appt.getPtId().equals(ptId)) {
            throw new BadRequestException("Not your appointment");
        }

        if ("CONFIRM".equalsIgnoreCase(request.getAction())) {
            appt.setStatus(AppointmentStatus.CONFIRMED);
        } else if ("CANCEL".equalsIgnoreCase(request.getAction())) {
            cancelLinkedSessionAndRefund(appt, "PT");
            appt.setStatus(AppointmentStatus.CANCELLED);
            appt.setCancelledBy("PT");
            appt.setCancelType(AppointmentCancelType.BY_PT);
        } else {
            throw new BadRequestException("Invalid action");
        }

        return appointmentRepository.save(appt);
    }

    @Override
    @Transactional
    public PtAppointment cancelByCustomer(UUID customerId, UUID appointmentId, CancelAppointmentRequest request) {
        PtAppointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appt.getClientId().equals(customerId)) {
            throw new BadRequestException("Not your appointment");
        }
        if (appt.getStatus() != AppointmentStatus.PENDING && appt.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new BadRequestException("Appointment cannot be cancelled");
        }
        if (appt.getStartTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Cannot cancel past appointment");
        }

        long hoursUntil = Duration.between(LocalDateTime.now(), appt.getStartTime()).toHours();
        appt.setStatus(AppointmentStatus.CANCELLED);
        appt.setCancelledBy("CUSTOMER");
        appt.setCancelType(hoursUntil >= CUSTOMER_NO_FEE_CANCEL_HOURS
                ? AppointmentCancelType.NO_FEE
                : AppointmentCancelType.LATE);
        if (request != null && request.getReason() != null) {
            appt.setCancelReason(request.getReason());
        }

        // Refund unused paid session when cancelled before start (both NO_FEE and LATE forfeit→refund
        // keeps escrow consistent: unused buổi chưa dạy returns to customer).
        cancelLinkedSessionAndRefund(appt, "CUSTOMER");
        return appointmentRepository.save(appt);
    }

    private void cancelLinkedSessionAndRefund(PtAppointment appt, String actor) {
        Optional<PtMappingSession> sessionOpt = resolveLinkedSession(appt);
        if (sessionOpt.isEmpty()) {
            return;
        }
        PtMappingSession session = sessionOpt.get();
        if (session.getStatus() != MappingSessionStatus.SCHEDULED) {
            return;
        }
        session.setStatus(MappingSessionStatus.CANCELLED);
        mappingSessionRepository.save(session);

        if (appt.getMappingId() == null) {
            return;
        }
        PtClientMapping mapping = mappingRepository.findById(appt.getMappingId()).orElse(null);
        if (mapping == null || mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            return;
        }
        BigDecimal perSession = mapping.getPerSessionAmount();
        if (perSession == null || perSession.signum() <= 0) {
            return;
        }
        BigDecimal remaining = walletService.getRemainingEscrow(mapping.getId());
        if (remaining.signum() <= 0) {
            return;
        }
        BigDecimal refund = perSession.min(remaining);
        walletService.refundToCustomer(
                mapping.getId(),
                refund,
                "MAPPING_SESSION",
                session.getId(),
                "Cancel unused offline session (" + actor + ")");
    }

    private Optional<PtMappingSession> resolveLinkedSession(PtAppointment appt) {
        if (appt.getMappingSessionId() != null) {
            return mappingSessionRepository.findById(appt.getMappingSessionId());
        }
        if (appt.getMappingId() == null || appt.getStartTime() == null) {
            return Optional.empty();
        }
        return mappingSessionRepository.findByMappingIdOrderBySequenceAsc(appt.getMappingId()).stream()
                .filter(s -> s.getStartTime().equals(appt.getStartTime()))
                .findFirst();
    }

    private void expireStale() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(PENDING_EXPIRY_HOURS);
        List<PtAppointment> stale = appointmentRepository
                .findByStatusAndCreatedAtBefore(AppointmentStatus.PENDING, cutoff);
        if (stale.isEmpty()) {
            return;
        }
        stale.forEach(a -> a.setStatus(AppointmentStatus.EXPIRED));
        appointmentRepository.saveAll(stale);
    }
}
