package com.sba.nutrican_be.admin.controller;

import com.sba.nutrican_be.admin.service.SosAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.SOSTicket;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<ApiResponse<PageResponse<SOSTicket>>> getSosTickets(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(sosAdminService.getSosTickets(status, page, size));
    }

    @PutMapping("/{ticketId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignSosTicket(
            @PathVariable UUID ticketId,
            @RequestBody Map<String, UUID> body) {
        return ResponseEntity.ok(sosAdminService.assignSosTicket(ticketId, body.get("ptId")));
    }
}
