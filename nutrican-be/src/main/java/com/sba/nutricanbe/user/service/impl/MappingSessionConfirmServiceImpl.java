package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeReviewRequest;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.entity.SessionDispute;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.SessionDisputeDecision;
import com.sba.nutricanbe.user.enums.SessionDisputeStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.SessionDisputeRepository;
import com.sba.nutricanbe.user.service.MappingSessionConfirmService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MappingSessionConfirmServiceImpl implements MappingSessionConfirmService {

    private final PtMappingSessionRepository sessionRepository;
    private final PtClientMappingRepository mappingRepository;
    private final SessionDisputeRepository disputeRepository;
    private final CoachingWalletService walletService;
    private final WebSocketSessionService webSocketSessionService;

    @Value("${app.session.confirm-timeout-hours:24}")
    private int confirmTimeoutHours;

    @Override
    @Transactional
    public MappingSessionResponse markDone(UUID ptUserId, UUID sessionId) {
        PtMappingSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mapping session", sessionId));
        PtClientMapping mapping = requireOfflineActiveMapping(session.getMappingId());
        if (!mapping.getPt().getId().equals(ptUserId)) {
            throw new UnauthorizedException("Only assigned PT can mark session done");
        }
        if (session.getStatus() != MappingSessionStatus.SCHEDULED) {
            throw new BadRequestException("Session cannot be marked done in status " + session.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        session.setStatus(MappingSessionStatus.AWAITING_CONFIRM);
        session.setPtMarkedDoneAt(now);
        session.setConfirmDeadlineAt(now.plusHours(confirmTimeoutHours));
        sessionRepository.save(session);

        Map<String, Object> payload = basePayload(mapping, session);
        payload.put("message", "PT vừa xác nhận xong buổi tập. Bạn xác nhận chứ?");
        webSocketSessionService.sendToUser(mapping.getClient().getId(), "SESSION_AWAITING_CONFIRM", payload);
        return MappingSessionResponse.from(session);
    }

    @Override
    @Transactional
    public MappingSessionResponse confirmByCustomer(UUID customerId, UUID sessionId) {
        PtMappingSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mapping session", sessionId));
        PtClientMapping mapping = requireOfflineActiveMapping(session.getMappingId());
        if (!mapping.getClient().getId().equals(customerId)) {
            throw new UnauthorizedException("Only customer can confirm this session");
        }
        if (session.getStatus() != MappingSessionStatus.AWAITING_CONFIRM) {
            throw new BadRequestException("Session is not awaiting confirmation");
        }
        return finalizeConfirm(session, mapping, MappingSessionStatus.CONFIRMED, false);
    }

    @Override
    @Transactional
    public MappingSessionResponse disputeByCustomer(UUID customerId, UUID sessionId,
                                                    SessionDisputeRequest request) {
        PtMappingSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mapping session", sessionId));
        PtClientMapping mapping = requireOfflineActiveMapping(session.getMappingId());
        if (!mapping.getClient().getId().equals(customerId)) {
            throw new UnauthorizedException("Only customer can dispute this session");
        }
        if (session.getStatus() != MappingSessionStatus.AWAITING_CONFIRM) {
            throw new BadRequestException("Session is not awaiting confirmation");
        }
        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Dispute reason is required");
        }
        if (disputeRepository.findBySessionId(sessionId).isPresent()) {
            throw new BadRequestException("Dispute already exists for this session");
        }

        session.setStatus(MappingSessionStatus.DISPUTED);
        session.setCustomerRespondedAt(LocalDateTime.now());
        sessionRepository.save(session);

        SessionDispute dispute = disputeRepository.save(SessionDispute.builder()
                .sessionId(session.getId())
                .mappingId(mapping.getId())
                .customerId(mapping.getClient().getId())
                .ptId(mapping.getPt().getId())
                .reason(request.getReason().trim())
                .status(SessionDisputeStatus.PENDING)
                .build());

        Map<String, Object> payload = basePayload(mapping, session);
        payload.put("disputeId", dispute.getId());
        payload.put("reason", dispute.getReason());
        payload.put("message", "Khách hàng khiếu nại buổi tập. Admin cần xử lý.");
        webSocketSessionService.sendToUser(mapping.getPt().getId(), "SESSION_DISPUTED", payload);

        return MappingSessionResponse.from(session);
    }

    @Override
    @Transactional
    public MappingSessionResponse autoConfirmExpired(UUID sessionId) {
        PtMappingSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Mapping session", sessionId));
        if (session.getStatus() != MappingSessionStatus.AWAITING_CONFIRM) {
            return MappingSessionResponse.from(session);
        }
        PtClientMapping mapping = requireOfflineActiveMapping(session.getMappingId());
        return finalizeConfirm(session, mapping, MappingSessionStatus.AUTO_CONFIRMED, true);
    }

    @Override
    @Transactional
    public int autoConfirmOverdueSessions() {
        List<PtMappingSession> overdue = sessionRepository.findByStatusAndConfirmDeadlineAtBefore(
                MappingSessionStatus.AWAITING_CONFIRM, LocalDateTime.now());
        int count = 0;
        for (PtMappingSession session : overdue) {
            try {
                autoConfirmExpired(session.getId());
                count++;
            } catch (RuntimeException ignored) {
                // continue other sessions
            }
        }
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionDisputeResponse> listDisputes(String status) {
        if (status != null && !status.isBlank()) {
            SessionDisputeStatus parsed = SessionDisputeStatus.valueOf(status.trim().toUpperCase());
            return disputeRepository.findByStatusOrderByCreatedAtDesc(parsed).stream()
                    .map(SessionDisputeResponse::from)
                    .toList();
        }
        return disputeRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(SessionDisputeResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public SessionDisputeResponse resolveDispute(UUID disputeId, SessionDisputeReviewRequest request) {
        if (request == null || request.getDecision() == null) {
            throw new BadRequestException("Admin decision is required");
        }
        SessionDispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Session dispute", disputeId));
        if (dispute.getStatus() != SessionDisputeStatus.PENDING) {
            throw new BadRequestException("Dispute already resolved");
        }

        PtMappingSession session = sessionRepository.findByIdForUpdate(dispute.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Mapping session", dispute.getSessionId()));
        PtClientMapping mapping = mappingRepository.findById(dispute.getMappingId())
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", dispute.getMappingId()));
        BigDecimal perSession = requirePerSessionAmount(mapping);

        SessionDisputeDecision decision = request.getDecision();
        BigDecimal ptAmount;
        BigDecimal customerAmount;
        switch (decision) {
            case TO_PT -> {
                ptAmount = perSession;
                customerAmount = BigDecimal.ZERO;
            }
            case TO_CUSTOMER -> {
                ptAmount = BigDecimal.ZERO;
                customerAmount = perSession;
            }
            case SPLIT -> {
                ptAmount = request.getPtAmount() != null ? request.getPtAmount() : BigDecimal.ZERO;
                customerAmount = request.getCustomerAmount() != null
                        ? request.getCustomerAmount() : BigDecimal.ZERO;
                if (ptAmount.signum() < 0 || customerAmount.signum() < 0) {
                    throw new BadRequestException("Split amounts must be non-negative");
                }
                if (ptAmount.add(customerAmount).compareTo(perSession) != 0) {
                    throw new BadRequestException("Split amounts must sum to per-session amount");
                }
            }
            default -> throw new BadRequestException("Unsupported decision");
        }

        if (ptAmount.signum() > 0 && customerAmount.signum() > 0) {
            walletService.settleSplit(mapping.getId(), ptAmount, customerAmount,
                    "SESSION_DISPUTE", dispute.getId(), "Admin split session dispute");
        } else if (ptAmount.signum() > 0) {
            walletService.releaseToPt(mapping.getId(), ptAmount,
                    "SESSION_DISPUTE", dispute.getId(), "Admin awarded session to PT");
        } else if (customerAmount.signum() > 0) {
            walletService.refundToCustomer(mapping.getId(), customerAmount,
                    "SESSION_DISPUTE", dispute.getId(), "Admin refunded disputed session to customer");
        }

        if (ptAmount.signum() > 0) {
            session.setStatus(MappingSessionStatus.CONFIRMED);
            session.setReleasedAmount(ptAmount);
        } else {
            session.setStatus(MappingSessionStatus.CANCELLED);
            session.setReleasedAmount(BigDecimal.ZERO);
        }
        sessionRepository.save(session);

        dispute.setStatus(SessionDisputeStatus.RESOLVED);
        dispute.setAdminDecision(decision);
        dispute.setPtAmount(ptAmount);
        dispute.setCustomerAmount(customerAmount);
        dispute.setAdminNote(request.getAdminNote());
        dispute.setResolvedAt(LocalDateTime.now());
        disputeRepository.save(dispute);

        Map<String, Object> payload = basePayload(mapping, session);
        payload.put("disputeId", dispute.getId());
        payload.put("decision", decision.name());
        payload.put("message", "Admin đã xử lý tranh chấp buổi tập: " + decision.name());
        webSocketSessionService.sendToUser(mapping.getClient().getId(), "SESSION_DISPUTE_RESOLVED", payload);
        webSocketSessionService.sendToUser(mapping.getPt().getId(), "SESSION_DISPUTE_RESOLVED", payload);

        return SessionDisputeResponse.from(dispute);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MappingSessionResponse> listSessionsForCustomer(UUID customerId) {
        PtClientMapping mapping = mappingRepository
                .findFirstByClient_IdAndStatus(customerId, ClientMappingStatus.ACTIVE)
                .or(() -> mappingRepository.findFirstByClient_IdAndStatus(
                        customerId, ClientMappingStatus.END_REQUESTED))
                .orElse(null);
        if (mapping == null || mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            return List.of();
        }
        return sessionRepository.findByMappingIdOrderBySequenceAsc(mapping.getId()).stream()
                .map(MappingSessionResponse::from)
                .toList();
    }

    private MappingSessionResponse finalizeConfirm(PtMappingSession session, PtClientMapping mapping,
                                                   MappingSessionStatus status, boolean auto) {
        BigDecimal perSession = requirePerSessionAmount(mapping);
        walletService.releaseToPt(mapping.getId(), perSession,
                "MAPPING_SESSION", session.getId(),
                auto ? "Auto-confirm session release to PT" : "Customer confirmed session release to PT");

        session.setStatus(status);
        session.setCustomerRespondedAt(LocalDateTime.now());
        session.setReleasedAmount(perSession);
        sessionRepository.save(session);

        Map<String, Object> payload = basePayload(mapping, session);
        payload.put("auto", auto);
        payload.put("message", auto
                ? "Buổi tập được tự động xác nhận sau timeout."
                : "Khách hàng đã xác nhận buổi tập.");
        webSocketSessionService.sendToUser(mapping.getPt().getId(), "SESSION_CONFIRMED", payload);
        webSocketSessionService.sendToUser(mapping.getClient().getId(), "SESSION_CONFIRMED", payload);
        return MappingSessionResponse.from(session);
    }

    private PtClientMapping requireOfflineActiveMapping(UUID mappingId) {
        PtClientMapping mapping = mappingRepository.findById(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        if (mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            throw new BadRequestException("Session confirmation applies to offline coaching only");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE
                && mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("Mapping is not active");
        }
        return mapping;
    }

    private BigDecimal requirePerSessionAmount(PtClientMapping mapping) {
        if (mapping.getPerSessionAmount() == null || mapping.getPerSessionAmount().signum() <= 0) {
            throw new BadRequestException("Per-session amount is missing for this package");
        }
        return mapping.getPerSessionAmount();
    }

    private Map<String, Object> basePayload(PtClientMapping mapping, PtMappingSession session) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("mappingId", mapping.getId());
        payload.put("sessionId", session.getId());
        payload.put("sequence", session.getSequence());
        payload.put("status", session.getStatus() != null ? session.getStatus().name() : null);
        payload.put("confirmDeadlineAt", session.getConfirmDeadlineAt());
        return payload;
    }
}
