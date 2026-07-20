package com.sba.nutricanbe.user.controller;



import com.sba.nutricanbe.common.dto.ApiResponse;

import com.sba.nutricanbe.common.exception.BadRequestException;

import com.sba.nutricanbe.common.exception.ResourceNotFoundException;

import com.sba.nutricanbe.user.entity.PtAppointment;

import com.sba.nutricanbe.user.entity.RefundRequest;

import com.sba.nutricanbe.user.entity.User;

import com.sba.nutricanbe.user.enums.AppointmentStatus;

import com.sba.nutricanbe.user.enums.ClientMappingStatus;

import com.sba.nutricanbe.user.enums.RefundReason;

import com.sba.nutricanbe.user.enums.RefundStatus;

import com.sba.nutricanbe.user.repository.PtAppointmentRepository;

import com.sba.nutricanbe.user.repository.PtClientMappingRepository;

import com.sba.nutricanbe.user.repository.RefundRequestRepository;

import com.sba.nutricanbe.user.service.AppointmentSlotHelper;

import lombok.Data;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.*;



import java.time.Duration;

import java.time.LocalDateTime;

import java.util.List;

import java.util.UUID;



@RestController

@RequiredArgsConstructor

public class AppointmentController {

    private final PtAppointmentRepository appointmentRepository;

    private final PtClientMappingRepository mappingRepository;

    private final RefundRequestRepository refundRepository;

    private final AppointmentSlotHelper appointmentSlotHelper;



    @PostMapping("/api/v1/marketplace/pts/{ptId}/appointments")

    @PreAuthorize("hasRole('CUSTOMER')")

    public ResponseEntity<ApiResponse<PtAppointment>> book(

            @AuthenticationPrincipal User customer,

            @PathVariable UUID ptId,

            @RequestBody AppointmentRequest request) {

        var mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, customer.getId())

                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)

                .orElseThrow(() -> new BadRequestException("No active PT mapping"));

        if (request.getStartTime() == null || request.getEndTime() == null) {

            throw new BadRequestException("startTime and endTime required");

        }

        appointmentSlotHelper.validateSlot(request.getStartTime(), request.getEndTime());

        appointmentSlotHelper.assertNoOverlap(ptId, request.getStartTime(), request.getEndTime(), null);

        PtAppointment appt = appointmentRepository.save(PtAppointment.builder()

                .clientId(customer.getId())

                .ptId(ptId)

                .mappingId(mapping.getId())

                .startTime(request.getStartTime())

                .endTime(request.getEndTime())

                .type(request.getType() != null ? request.getType() : "ONLINE")

                .note(request.getNote())

                .status(AppointmentStatus.PENDING)

                .build());

        return ResponseEntity.ok(ApiResponse.success(appt, "Appointment requested"));

    }



    @GetMapping("/api/v1/appointments/upcoming")

    @PreAuthorize("hasRole('CUSTOMER')")

    public ResponseEntity<ApiResponse<List<PtAppointment>>> upcomingCustomer(@AuthenticationPrincipal User user) {

        return ResponseEntity.ok(ApiResponse.success(

                appointmentRepository.findByClientIdAndStatusInOrderByStartTimeAsc(

                        user.getId(), List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED))));

    }



    @GetMapping("/api/v1/workspace/appointments")

    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")

    public ResponseEntity<ApiResponse<List<PtAppointment>>> upcomingPt(@AuthenticationPrincipal User pt) {

        expireStale();

        return ResponseEntity.ok(ApiResponse.success(

                appointmentRepository.findByPtIdAndStatusInOrderByStartTimeAsc(

                        pt.getId(), List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED))));

    }



    @PutMapping("/api/v1/workspace/appointments/{id}")

    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")

    public ResponseEntity<ApiResponse<PtAppointment>> updateAppointment(

            @AuthenticationPrincipal User pt,

            @PathVariable UUID id,

            @RequestBody AppointmentActionRequest request) {

        PtAppointment appt = appointmentRepository.findById(id)

                .orElseThrow(() -> new ResourceNotFoundException("Appointment", id));

        if (!appt.getPtId().equals(pt.getId())) {

            throw new BadRequestException("Not your appointment");

        }

        if ("CONFIRM".equalsIgnoreCase(request.getAction())) {

            appt.setStatus(AppointmentStatus.CONFIRMED);

        } else if ("CANCEL".equalsIgnoreCase(request.getAction())) {

            appt.setStatus(AppointmentStatus.CANCELLED);
            appt.setCancelledBy("PT");
            appt.setCancelType(com.sba.nutricanbe.user.enums.AppointmentCancelType.BY_PT);

            long hoursUntil = Duration.between(LocalDateTime.now(), appt.getStartTime()).toHours();

            if (hoursUntil < 24 && appt.getMappingId() != null) {

                refundRepository.save(RefundRequest.builder()

                        .mappingId(appt.getMappingId())

                        .customerId(appt.getClientId())

                        .ptId(appt.getPtId())

                        .reason(RefundReason.PT_CANCEL)

                        .note("PT cancelled appointment within 24h")

                        .status(RefundStatus.AUTO_APPROVED)

                        .build());

            }

        } else {

            throw new BadRequestException("Invalid action");

        }

        return ResponseEntity.ok(ApiResponse.success(appointmentRepository.save(appt)));

    }



    @PutMapping("/api/v1/appointments/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PtAppointment>> cancelByCustomer(
            @AuthenticationPrincipal User customer,
            @PathVariable UUID id,
            @RequestBody(required = false) CancelAppointmentRequest request) {
        PtAppointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
        if (!appt.getClientId().equals(customer.getId())) {
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
        if (hoursUntil >= 48) {
            appt.setCancelType(com.sba.nutricanbe.user.enums.AppointmentCancelType.NO_FEE);
        } else {
            appt.setCancelType(com.sba.nutricanbe.user.enums.AppointmentCancelType.LATE);
        }
        if (request != null && request.getReason() != null) {
            appt.setCancelReason(request.getReason());
        }
        PtAppointment saved = appointmentRepository.save(appt);
        return ResponseEntity.ok(ApiResponse.success(saved, "Appointment cancelled"));
    }

    private void expireStale() {

        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);

        appointmentRepository.findAll().stream()

                .filter(a -> a.getStatus() == AppointmentStatus.PENDING && a.getCreatedAt().isBefore(cutoff))

                .forEach(a -> {

                    a.setStatus(AppointmentStatus.EXPIRED);

                    appointmentRepository.save(a);

                });

    }



    @Data
    public static class CancelAppointmentRequest {
        private String reason;
    }

    @Data

    public static class AppointmentRequest {

        private LocalDateTime startTime;

        private LocalDateTime endTime;

        private String type;

        private String note;

    }



    @Data

    public static class AppointmentActionRequest {

        private String action;

    }

}


