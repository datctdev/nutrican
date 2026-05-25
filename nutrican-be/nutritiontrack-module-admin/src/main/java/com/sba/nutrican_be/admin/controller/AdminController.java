package com.sba.nutrican_be.admin.controller;

import com.sba.nutrican_be.admin.dto.AdminDashboardDto;
import com.sba.nutrican_be.admin.dto.PendingPtDto;
import com.sba.nutrican_be.admin.dto.PtVerificationRequest;
import com.sba.nutrican_be.admin.service.AdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<User>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(adminService.getUsers(role, status, search, page, size));
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<ApiResponse<Void>> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(adminService.updateUserStatus(userId, body.get("status")));
    }

    @GetMapping("/pts/pending")
    public ResponseEntity<ApiResponse<PageResponse<PendingPtDto>>> getPendingPts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(adminService.getPendingPts(page, size));
    }

    @PutMapping("/pts/{userId}/verify")
    public ResponseEntity<ApiResponse<Void>> verifyPt(
            @PathVariable Long userId,
            @RequestBody PtVerificationRequest request) {
        return ResponseEntity.ok(adminService.verifyPt(userId, request));
    }

    @GetMapping("/pts/{ptId}/documents")
    public ResponseEntity<ApiResponse<PageResponse<PendingPtDto>>> getPtDocuments(@PathVariable Long ptId) {
        return ResponseEntity.ok(adminService.getPendingPts(0, 1000));
    }

    @GetMapping("/sos-tickets")
    public ResponseEntity<ApiResponse<PageResponse<SOSTicket>>> getSosTickets(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(adminService.getSosTickets(status, page, size));
    }

    @PutMapping("/sos-tickets/{ticketId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignSosTicket(
            @PathVariable Long ticketId,
            @RequestBody java.util.Map<String, Long> body) {
        return ResponseEntity.ok(adminService.assignSosTicket(ticketId, body.get("ptId")));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDashboardDto>> getStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }
}
