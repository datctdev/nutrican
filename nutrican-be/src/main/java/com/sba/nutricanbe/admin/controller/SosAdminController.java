package com.sba.nutricanbe.admin.controller;

import com.sba.nutricanbe.admin.dto.SosTicketAdminResponse;
import com.sba.nutricanbe.admin.service.SosAdminService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/sos-tickets")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SosAdminController {

    private final SosAdminService sosAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SosTicketAdminResponse>>> getSosTickets(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(sosAdminService.getSosTickets(status, page, size));
    }

    @PutMapping("/{ticketId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignSosTicket(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID ticketId,
            @RequestBody Map<String, UUID> body) {
        return ResponseEntity.ok(sosAdminService.assignSosTicket(ticketId, body.get("ptId"), admin.getId()));
    }

    @PutMapping("/{ticketId}/close")
    public ResponseEntity<ApiResponse<Void>> closeSosTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(sosAdminService.closeSosTicket(ticketId));
    }
}
