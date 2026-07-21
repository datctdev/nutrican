package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.dto.AppointmentActionRequest;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.dto.CancelAppointmentRequest;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.enums.RefundStatus;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import com.sba.nutricanbe.user.service.AppointmentService;
import com.sba.nutricanbe.user.service.AppointmentSlotHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

    private static final int PT_LATE_CANCEL_REFUND_HOURS = 24;
    private static final int CUSTOMER_NO_FEE_CANCEL_HOURS = 48;
    private static final int PENDING_EXPIRY_HOURS = 24;
    private static final String DEFAULT_APPOINTMENT_TYPE = "ONLINE";

    private final PtAppointmentRepository appointmentRepository;
    private final PtClientMappingRepository mappingRepository;
    private final RefundRequestRepository refundRepository;
    private final AppointmentSlotHelper appointmentSlotHelper;

    @Override
    @Transactional
    public PtAppointment book(UUID customerId, UUID ptId, BookAppointmentRequest request) {
        PtClientMapping mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, customerId)
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException("No active PT mapping"));

        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new BadRequestException("startTime and endTime required");
        }
        appointmentSlotHelper.validateSlot(request.getStartTime(), request.getEndTime());
        appointmentSlotHelper.assertNoOverlap(ptId, request.getStartTime(), request.getEndTime(), null);

        return appointmentRepository.save(PtAppointment.builder()
                .clientId(customerId)
                .ptId(ptId)
                .mappingId(mapping.getId())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .type(request.getType() != null ? request.getType() : DEFAULT_APPOINTMENT_TYPE)
                .note(request.getNote())
                .status(AppointmentStatus.PENDING)
                .build());
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
            cancelByPt(appt);
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
        return appointmentRepository.save(appt);
    }

    private void cancelByPt(PtAppointment appt) {
        appt.setStatus(AppointmentStatus.CANCELLED);
        appt.setCancelledBy("PT");
        appt.setCancelType(AppointmentCancelType.BY_PT);

        long hoursUntil = Duration.between(LocalDateTime.now(), appt.getStartTime()).toHours();
        if (hoursUntil < PT_LATE_CANCEL_REFUND_HOURS && appt.getMappingId() != null) {
            refundRepository.save(RefundRequest.builder()
                    .mappingId(appt.getMappingId())
                    .customerId(appt.getClientId())
                    .ptId(appt.getPtId())
                    .reason(RefundReason.PT_CANCEL)
                    .note("PT cancelled appointment within 24h")
                    .status(RefundStatus.AUTO_APPROVED)
                    .build());
        }
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
