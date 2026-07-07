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
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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

    @PostMapping("/api/v1/refunds")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<RefundRequest>> requestRefund(
            @AuthenticationPrincipal User customer,
            @RequestBody RefundCreateRequest request) {
        PtClientMapping mapping = mappingRepository.findById(request.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("Mapping", request.getMappingId()));
        if (!mapping.getClient().getId().equals(customer.getId())) {
            throw new BadRequestException("Not your mapping");
        }
        long days = ChronoUnit.DAYS.between(mapping.getCreatedAt(), LocalDateTime.now());
        if (days > 7) {
            throw new BadRequestException("Refund period expired");
        }
        RefundStatus status = (request.getReason() == RefundReason.PT_CANCEL
                || request.getReason() == RefundReason.PT_NO_RESPONSE)
                ? RefundStatus.AUTO_APPROVED : RefundStatus.PENDING_REVIEW;
        RefundRequest refund = refundRepository.save(RefundRequest.builder()
                .mappingId(mapping.getId())
                .customerId(customer.getId())
                .ptId(mapping.getPt().getId())
                .reason(request.getReason())
                .note(request.getNote())
                .status(status)
                .build());
        if (status == RefundStatus.AUTO_APPROVED) {
            mapping.setStatus(ClientMappingStatus.INACTIVE);
            mapping.setTerminationReason(TerminationReason.REFUND);
            mappingRepository.save(mapping);
            notifyRefund(mapping.getClient().getId(), mapping.getPt().getId(), refund, "AUTO_APPROVED");
        }
        return ResponseEntity.ok(ApiResponse.success(refund, "Refund request submitted"));
    }

    @GetMapping("/api/v1/admin/refunds")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RefundRequest>>> listRefunds() {
        return ResponseEntity.ok(ApiResponse.success(refundRepository.findAllByOrderByCreatedAtDesc()));
    }

    @PutMapping("/api/v1/admin/refunds/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RefundRequest>> reviewRefund(
            @PathVariable UUID id,
            @RequestBody RefundReviewRequest request) {
        RefundRequest refund = refundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Refund", id));
        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            refund.setStatus(RefundStatus.APPROVED);
        } else {
            refund.setStatus(RefundStatus.REJECTED);
        }
        refund.setAdminNote(request.getAdminNote());
        RefundRequest saved = refundRepository.save(refund);
        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            mappingRepository.findById(saved.getMappingId()).ifPresent(m -> {
                m.setStatus(ClientMappingStatus.INACTIVE);
                m.setTerminationReason(TerminationReason.REFUND);
                mappingRepository.save(m);
                notifyRefund(m.getClient().getId(), m.getPt().getId(), saved, "APPROVED");
            });
        } else {
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
