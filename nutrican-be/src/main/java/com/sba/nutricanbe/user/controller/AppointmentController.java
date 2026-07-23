package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.AppointmentActionRequest;
import com.sba.nutricanbe.user.dto.AppointmentResponse;
import com.sba.nutricanbe.user.dto.AddMappingSessionRequest;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.dto.CancelAppointmentRequest;
import com.sba.nutricanbe.user.dto.RescheduleAppointmentRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping("/api/v1/marketplace/pts/{ptId}/appointments")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> book(
            @AuthenticationPrincipal User customer,
            @PathVariable UUID ptId,
            @RequestBody BookAppointmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                AppointmentResponse.from(appointmentService.book(customer.getId(), ptId, request)),
                "Appointment requested"));
    }

    @GetMapping("/api/v1/appointments/upcoming")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> upcomingCustomer(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.upcomingForCustomer(user.getId()).stream()
                        .map(AppointmentResponse::from)
                        .toList()));
    }

    @GetMapping("/api/v1/workspace/appointments")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> upcomingPt(
            @AuthenticationPrincipal User pt) {
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.upcomingForPt(pt.getId()).stream()
                        .map(AppointmentResponse::from)
                        .toList()));
    }

    @PutMapping("/api/v1/workspace/appointments/{id}")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateAppointment(
            @AuthenticationPrincipal User pt,
            @PathVariable UUID id,
            @RequestBody AppointmentActionRequest request) {
        AppointmentResponse body = appointmentService.updateByPt(pt.getId(), id, request);
        String msg = (request != null && "CANCEL".equalsIgnoreCase(request.getAction()))
                ? refundMessage(body.getRefundedAmount())
                : "Đã cập nhật lịch hẹn";
        return ResponseEntity.ok(ApiResponse.success(body, msg));
    }

    @PutMapping("/api/v1/appointments/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelByCustomer(
            @AuthenticationPrincipal User customer,
            @PathVariable UUID id,
            @RequestBody(required = false) CancelAppointmentRequest request) {
        AppointmentResponse body = appointmentService.cancelByCustomer(customer.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(body, customerCancelMessage(body)));
    }

    @PutMapping("/api/v1/workspace/appointments/{id}/reschedule")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> reschedule(
            @AuthenticationPrincipal User pt,
            @PathVariable UUID id,
            @RequestBody RescheduleAppointmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.rescheduleByPt(pt.getId(), id, request),
                "Đã đổi lịch buổi tập"));
    }

    @PostMapping("/api/v1/workspace/mappings/{mappingId}/sessions")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> addSession(
            @AuthenticationPrincipal User pt,
            @PathVariable UUID mappingId,
            @RequestBody AddMappingSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.addSessionByPt(pt.getId(), mappingId, request),
                "Đã thêm buổi tập offline"));
    }

    private static String customerCancelMessage(AppointmentResponse body) {
        if (body != null && body.getCancelType() == com.sba.nutricanbe.user.enums.AppointmentCancelType.LATE) {
            return "Đã hủy sát giờ (<48h) — không hoàn tiền vào ví; suất được ghi nhận cho PT";
        }
        return refundMessage(body != null ? body.getRefundedAmount() : null);
    }

    private static String refundMessage(java.math.BigDecimal refunded) {
        if (refunded != null && refunded.signum() > 0) {
            return "Đã hủy buổi và hoàn "
                    + String.format("%,d", refunded.setScale(0, java.math.RoundingMode.HALF_UP).longValue())
                    + "đ vào ví học viên";
        }
        return "Đã hủy buổi (không còn tiền trong escrow để hoàn)";
    }
}
