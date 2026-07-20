package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.enums.RefundStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.enums.TerminationReason;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class RefundController {

    private final RefundRequestRepository refundRepository;
    private final PtClientMappingRepository mappingRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final CoachingWalletService coachingWalletService;

    @PostMapping("/api/v1/refunds")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Transactional
    public ResponseEntity<ApiResponse<RefundRequest>> requestRefund(
            @AuthenticationPrincipal User customer,
            @RequestBody RefundCreateRequest request) {
        if (request.getMappingId() == null || request.getReason() == null) {
            throw new BadRequestException("mappingId and refund reason are required");
        }
        PtClientMapping mapping = mappingRepository.findByIdForUpdate(request.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("Mapping", request.getMappingId()));
        if (!mapping.getClient().getId().equals(customer.getId())) {
            throw new BadRequestException("Not your mapping");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE
                && mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("Only active paid coaching can be refunded");
        }
        LocalDateTime refundStart = mapping.getCoachingStartedAt() != null
                ? mapping.getCoachingStartedAt() : mapping.getCreatedAt();
        if (LocalDateTime.now().isAfter(refundStart.plusDays(7))) {
            throw new BadRequestException("Refund period expired");
        }
        if (refundRepository.existsByMappingIdAndStatus(
                mapping.getId(), RefundStatus.PENDING_REVIEW)) {
            throw new BadRequestException("A refund request is already pending review");
        }
        // A customer-selected reason is a claim, not system evidence. Keep the
        // escrow held until an admin verifies and approves the request.
        if (!coachingWalletService.markEscrowDisputedIfPresent(mapping.getId())) {
            throw new BadRequestException("No held coaching payment is available for refund");
        }
        RefundStatus status = RefundStatus.PENDING_REVIEW;
        RefundRequest refund = refundRepository.save(RefundRequest.builder()
                .mappingId(mapping.getId())
                .customerId(customer.getId())
                .ptId(mapping.getPt().getId())
                .reason(request.getReason())
                .note(request.getNote())
                .status(status)
                .build());
        notifyRefund(mapping.getClient().getId(), mapping.getPt().getId(), refund, "PENDING_REVIEW");
        return ResponseEntity.ok(ApiResponse.success(refund, "Refund request submitted"));
    }

    @GetMapping("/api/v1/admin/refunds")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RefundRequest>>> listRefunds() {
        return ResponseEntity.ok(ApiResponse.success(refundRepository.findAllByOrderByCreatedAtDesc()));
    }

    @PutMapping("/api/v1/admin/refunds/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<RefundRequest>> reviewRefund(
            @PathVariable UUID id,
            @RequestBody RefundReviewRequest request) {
        if (request == null || request.getAction() == null) {
            throw new BadRequestException("Refund action is required");
        }
        RefundRequest refund = refundRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Refund", id));
        if (refund.getStatus() != RefundStatus.PENDING_REVIEW) {
            throw new BadRequestException("Only pending refund requests can be reviewed");
        }
        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            refund.setStatus(RefundStatus.APPROVED);
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            refund.setStatus(RefundStatus.REJECTED);
        } else {
            throw new BadRequestException("Refund action must be APPROVE or REJECT");
        }
        refund.setAdminNote(request.getAdminNote());
        RefundRequest saved = refundRepository.save(refund);
        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            PtClientMapping mapping = mappingRepository.findByIdForUpdate(saved.getMappingId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Mapping", saved.getMappingId()));
            if (!coachingWalletService.refundEscrowIfPresent(mapping.getId())) {
                throw new BadRequestException("No coaching escrow is available for refund");
            }
            mapping.setStatus(ClientMappingStatus.INACTIVE);
            mapping.setTerminationReason(TerminationReason.REFUND);
            mappingRepository.save(mapping);
            notifyRefund(mapping.getClient().getId(), mapping.getPt().getId(), saved, "APPROVED");
        } else {
            if (!coachingWalletService.rejectEscrowDisputeIfPresent(saved.getMappingId())) {
                throw new BadRequestException("No coaching escrow dispute was found");
            }
            notifyRefund(saved.getCustomerId(), saved.getPtId(), saved, "REJECTED");
        }
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    private void notifyRefund(UUID customerId, UUID ptId, RefundRequest refund, String action) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("refundId", refund.getId());
        payload.put("status", refund.getStatus().name());
        payload.put("action", action);
        payload.put("reason", refund.getReason().name());
        payload.put("adminNote", refund.getAdminNote() != null ? refund.getAdminNote() : "");
        webSocketSessionService.sendToUser(customerId, "REFUND_UPDATE", payload);
        webSocketSessionService.sendToUser(ptId, "REFUND_UPDATE", payload);
    }

    @Data
    public static class RefundCreateRequest {
        private UUID mappingId;
        private RefundReason reason;
        private String note;
    }

    @Data
    public static class RefundReviewRequest {
        private String action;
        private String adminNote;
    }
}
