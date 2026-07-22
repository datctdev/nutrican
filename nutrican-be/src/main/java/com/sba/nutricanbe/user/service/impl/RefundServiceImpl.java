package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.RefundCreateRequest;
import com.sba.nutricanbe.user.dto.RefundReviewRequest;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.RefundStatus;
import com.sba.nutricanbe.user.enums.TerminationReason;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import com.sba.nutricanbe.user.service.RefundService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefundServiceImpl implements RefundService {

    private static final int REFUND_WINDOW_DAYS = 7;

    private final RefundRequestRepository refundRepository;
    private final PtClientMappingRepository mappingRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final CoachingWalletService coachingWalletService;

    @Override
    @Transactional
    public RefundRequest requestRefund(UUID customerId, RefundCreateRequest request) {
        if (request.getMappingId() == null || request.getReason() == null) {
            throw new BadRequestException("mappingId and refund reason are required");
        }
        PtClientMapping mapping = mappingRepository.findByIdForUpdate(request.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("Mapping", request.getMappingId()));
        if (!mapping.getClient().getId().equals(customerId)) {
            throw new BadRequestException("Not your mapping");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE
                && mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("Only active paid coaching can be refunded");
        }
        LocalDateTime refundStart = mapping.getCoachingStartedAt() != null
                ? mapping.getCoachingStartedAt() : mapping.getCreatedAt();
        if (LocalDateTime.now().isAfter(refundStart.plusDays(REFUND_WINDOW_DAYS))) {
            throw new BadRequestException("Refund period expired");
        }
        if (refundRepository.existsByMappingIdAndStatus(mapping.getId(), RefundStatus.PENDING_REVIEW)) {
            throw new BadRequestException("A refund request is already pending review");
        }
        if (!coachingWalletService.markEscrowDisputedIfPresent(mapping.getId())) {
            throw new BadRequestException("No held coaching payment is available for refund");
        }
        RefundRequest refund = refundRepository.save(RefundRequest.builder()
                .mappingId(mapping.getId())
                .customerId(customerId)
                .ptId(mapping.getPt().getId())
                .reason(request.getReason())
                .note(request.getNote())
                .status(RefundStatus.PENDING_REVIEW)
                .build());
        notifyRefund(mapping.getClient().getId(), mapping.getPt().getId(), refund, "PENDING_REVIEW");
        return refund;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RefundRequest> listAll() {
        return refundRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    @Transactional
    public RefundRequest review(UUID refundId, RefundReviewRequest request) {
        if (request == null || request.getAction() == null) {
            throw new BadRequestException("Refund action is required");
        }
        RefundRequest refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund", refundId));
        if (refund.getStatus() != RefundStatus.PENDING_REVIEW) {
            throw new BadRequestException("Only pending refund requests can be reviewed");
        }

        boolean approve;
        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            approve = true;
            refund.setStatus(RefundStatus.APPROVED);
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            approve = false;
            refund.setStatus(RefundStatus.REJECTED);
        } else {
            throw new BadRequestException("Refund action must be APPROVE or REJECT");
        }
        refund.setAdminNote(request.getAdminNote());
        RefundRequest saved = refundRepository.save(refund);

        if (approve) {
            approveRefund(saved);
        } else {
            rejectRefund(saved);
        }
        return saved;
    }

    private void approveRefund(RefundRequest saved) {
        PtClientMapping mapping = mappingRepository.findByIdForUpdate(saved.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("Mapping", saved.getMappingId()));
        if (!coachingWalletService.refundEscrowIfPresent(mapping.getId())) {
            throw new BadRequestException("No coaching escrow is available for refund");
        }
        mapping.setStatus(ClientMappingStatus.INACTIVE);
        mapping.setTerminationReason(TerminationReason.REFUND);
        mappingRepository.save(mapping);
        notifyRefund(mapping.getClient().getId(), mapping.getPt().getId(), saved, "APPROVED");
    }

    private void rejectRefund(RefundRequest saved) {
        if (!coachingWalletService.rejectEscrowDisputeIfPresent(saved.getMappingId())) {
            throw new BadRequestException("No coaching escrow dispute was found");
        }
        notifyRefund(saved.getCustomerId(), saved.getPtId(), saved, "REJECTED");
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
}
