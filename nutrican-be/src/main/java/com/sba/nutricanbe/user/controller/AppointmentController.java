package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.AppointmentActionRequest;
import com.sba.nutricanbe.user.dto.AppointmentResponse;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.dto.CancelAppointmentRequest;
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
        return ResponseEntity.ok(ApiResponse.success(
                AppointmentResponse.from(appointmentService.updateByPt(pt.getId(), id, request))));
    }

    @PutMapping("/api/v1/appointments/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelByCustomer(
            @AuthenticationPrincipal User customer,
            @PathVariable UUID id,
            @RequestBody(required = false) CancelAppointmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                AppointmentResponse.from(appointmentService.cancelByCustomer(customer.getId(), id, request)),
                "Appointment cancelled"));
    }
}
