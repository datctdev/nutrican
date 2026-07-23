package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeMessageRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeMessageResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeReviewRequest;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.entity.SessionDispute;
import com.sba.nutricanbe.user.entity.SessionDisputeMessage;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.SessionDisputeAuthorRole;
import com.sba.nutricanbe.user.enums.SessionDisputeDecision;
import com.sba.nutricanbe.user.enums.SessionDisputeStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.SessionDisputeMessageRepository;
import com.sba.nutricanbe.user.repository.SessionDisputeRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.MappingSessionConfirmService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MappingSessionConfirmServiceImpl implements MappingSessionConfirmService {

    private final PtMappingSessionRepository sessionRepository;
    private final PtClientMappingRepository mappingRepository;
    private final SessionDisputeRepository disputeRepository;
    private final SessionDisputeMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CoachingWalletService walletService;
    private final WebSocketSessionService webSocketSessionService;
    private final MappingSessionConfirmService self;

    @Value("${app.session.confirm-timeout-hours:24}")
    private int confirmTimeoutHours;

    public MappingSessionConfirmServiceImpl(
            PtMappingSessionRepository sessionRepository,
            PtClientMappingRepository mappingRepository,
            SessionDisputeRepository disputeRepository,
            SessionDisputeMessageRepository messageRepository,
            UserRepository userRepository,
            CoachingWalletService walletService,
            WebSocketSessionService webSocketSessionService,
            @Lazy MappingSessionConfirmService self) {
        this.sessionRepository = sessionRepository;
        this.mappingRepository = mappingRepository;
        this.disputeRepository = disputeRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.walletService = walletService;
        this.webSocketSessionService = webSocketSessionService;
        this.self = self;
    }

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
        LocalDateTime now = DietDates.nowVn();
        if (session.getStartTime() != null && session.getStartTime().isAfter(now)) {
            throw new BadRequestException("Chỉ xác nhận đã dạy khi buổi đã bắt đầu");
        }

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

        String reason = request.getReason().trim();
        SessionDispute dispute = disputeRepository.save(SessionDispute.builder()
                .sessionId(session.getId())
                .mappingId(mapping.getId())
                .customerId(mapping.getClient().getId())
                .ptId(mapping.getPt().getId())
                .reason(reason)
                .status(SessionDisputeStatus.PENDING)
                .build());

        messageRepository.save(SessionDisputeMessage.builder()
                .disputeId(dispute.getId())
                .authorId(customerId)
                .authorRole(SessionDisputeAuthorRole.CUSTOMER)
                .body(reason)
                .build());

        Map<String, Object> payload = basePayload(mapping, session);
        payload.put("disputeId", dispute.getId());
        payload.put("reason", reason);
        payload.put("message", "Khách hàng không đồng ý buổi tập — cần phản hồi / chờ admin xử lý.");
        webSocketSessionService.sendToUser(mapping.getPt().getId(), "SESSION_DISPUTED", payload);
        notifyAdmins("SESSION_DISPUTED", payload);

        return MappingSessionResponse.from(session);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
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
    public int autoConfirmOverdueSessions() {
        List<PtMappingSession> overdue = sessionRepository.findByStatusAndConfirmDeadlineAtBefore(
                MappingSessionStatus.AWAITING_CONFIRM, DietDates.nowVn());
        int count = 0;
        for (PtMappingSession session : overdue) {
            try {
                self.autoConfirmExpired(session.getId());
                count++;
            } catch (RuntimeException ex) {
                log.warn("Auto-confirm failed for session {}: {}", session.getId(), ex.getMessage());
            }
        }
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionDisputeResponse> listDisputes(String status) {
        List<SessionDispute> disputes = loadByStatus(status);
        return enrichAll(disputes);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionDisputeResponse> listDisputesForPt(UUID ptUserId, String status) {
        List<SessionDispute> disputes;
        if (status != null && !status.isBlank()) {
            SessionDisputeStatus parsed = SessionDisputeStatus.valueOf(status.trim().toUpperCase());
            disputes = disputeRepository.findByPtIdAndStatusOrderByCreatedAtDesc(ptUserId, parsed);
        } else {
            disputes = disputeRepository.findByPtIdOrderByCreatedAtDesc(ptUserId);
        }
        return enrichAll(disputes);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionDisputeResponse> listDisputesForCustomer(UUID customerId, String status) {
        List<SessionDispute> disputes;
        if (status != null && !status.isBlank()) {
            SessionDisputeStatus parsed = SessionDisputeStatus.valueOf(status.trim().toUpperCase());
            disputes = disputeRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, parsed);
        } else {
            disputes = disputeRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        }
        return enrichAll(disputes);
    }

    @Override
    @Transactional
    public SessionDisputeResponse addDisputeMessage(UUID userId, UUID disputeId,
                                                    SessionDisputeMessageRequest request,
                                                    boolean asAdmin) {
        if (request == null || request.getBody() == null || request.getBody().isBlank()) {
            throw new BadRequestException("Message body is required");
        }
        SessionDispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Session dispute", disputeId));
        if (dispute.getStatus() != SessionDisputeStatus.PENDING) {
            throw new BadRequestException("Cannot reply to a resolved dispute");
        }

        SessionDisputeAuthorRole role;
        if (asAdmin) {
            User admin = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId));
            if (admin.getRole() != UserRole.ADMIN) {
                throw new UnauthorizedException("Only admin can post as admin");
            }
            role = SessionDisputeAuthorRole.ADMIN;
        } else if (dispute.getPtId().equals(userId)) {
            role = SessionDisputeAuthorRole.PT;
        } else if (dispute.getCustomerId().equals(userId)) {
            role = SessionDisputeAuthorRole.CUSTOMER;
        } else {
            throw new UnauthorizedException("Not a participant of this dispute");
        }

        String body = request.getBody().trim();
        messageRepository.save(SessionDisputeMessage.builder()
                .disputeId(dispute.getId())
                .authorId(userId)
                .authorRole(role)
                .body(body)
                .build());

        if (role == SessionDisputeAuthorRole.PT) {
            dispute.setPtNote(body);
            dispute.setPtRespondedAt(LocalDateTime.now());
            disputeRepository.save(dispute);
        }

        PtMappingSession session = sessionRepository.findById(dispute.getSessionId()).orElse(null);
        PtClientMapping mapping = mappingRepository.findById(dispute.getMappingId()).orElse(null);

        Map<String, Object> payload = new HashMap<>();
        if (mapping != null && session != null) {
            payload.putAll(basePayload(mapping, session));
        }
        payload.put("disputeId", dispute.getId());
        payload.put("authorRole", role.name());
        payload.put("body", body);
        payload.put("message", debateNotifyMessage(role));

        if (role == SessionDisputeAuthorRole.CUSTOMER) {
            webSocketSessionService.sendToUser(dispute.getPtId(), "SESSION_DISPUTE_MESSAGE", payload);
            notifyAdmins("SESSION_DISPUTE_MESSAGE", payload);
        } else if (role == SessionDisputeAuthorRole.PT) {
            webSocketSessionService.sendToUser(dispute.getCustomerId(), "SESSION_DISPUTE_MESSAGE", payload);
            notifyAdmins("SESSION_DISPUTE_MESSAGE", payload);
        } else {
            webSocketSessionService.sendToUser(dispute.getCustomerId(), "SESSION_DISPUTE_MESSAGE", payload);
            webSocketSessionService.sendToUser(dispute.getPtId(), "SESSION_DISPUTE_MESSAGE", payload);
        }

        return enrichOne(dispute);
    }

    @Override
    @Transactional
    public SessionDisputeResponse resolveDispute(UUID adminId, UUID disputeId, SessionDisputeReviewRequest request) {
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
            walletService.forceSettleSplit(mapping.getId(), ptAmount, customerAmount,
                    "SESSION_DISPUTE", dispute.getId(), "Admin split session dispute");
        } else if (ptAmount.signum() > 0) {
            walletService.forceReleaseToPt(mapping.getId(), ptAmount,
                    "SESSION_DISPUTE", dispute.getId(), "Admin awarded session to PT");
        } else if (customerAmount.signum() > 0) {
            walletService.forceRefundToCustomer(mapping.getId(), customerAmount,
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

        String adminNote = request.getAdminNote() != null && !request.getAdminNote().isBlank()
                ? request.getAdminNote().trim()
                : ("Admin quyết định: " + decision.name());
        dispute.setStatus(SessionDisputeStatus.RESOLVED);
        dispute.setAdminDecision(decision);
        dispute.setPtAmount(ptAmount);
        dispute.setCustomerAmount(customerAmount);
        dispute.setAdminNote(adminNote);
        dispute.setResolvedAt(LocalDateTime.now());
        disputeRepository.save(dispute);

        messageRepository.save(SessionDisputeMessage.builder()
                .disputeId(dispute.getId())
                .authorId(adminId != null ? adminId : dispute.getCustomerId())
                .authorRole(SessionDisputeAuthorRole.ADMIN)
                .body(buildResolveBody(decision, ptAmount, customerAmount, adminNote))
                .build());

        Map<String, Object> payload = basePayload(mapping, session);
        payload.put("disputeId", dispute.getId());
        payload.put("decision", decision.name());
        payload.put("ptAmount", ptAmount);
        payload.put("customerAmount", customerAmount);
        payload.put("adminNote", adminNote);
        payload.put("message", "Admin đã xử lý tranh chấp buổi tập: " + decisionLabel(decision));
        webSocketSessionService.sendToUser(mapping.getClient().getId(), "SESSION_DISPUTE_RESOLVED", payload);
        webSocketSessionService.sendToUser(mapping.getPt().getId(), "SESSION_DISPUTE_RESOLVED", payload);

        return enrichOne(dispute);
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

    @Override
    @Transactional(readOnly = true)
    public long countPendingDisputes() {
        return disputeRepository.countByStatus(SessionDisputeStatus.PENDING);
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

    private List<SessionDispute> loadByStatus(String status) {
        if (status != null && !status.isBlank()) {
            SessionDisputeStatus parsed = SessionDisputeStatus.valueOf(status.trim().toUpperCase());
            return disputeRepository.findByStatusOrderByCreatedAtDesc(parsed);
        }
        return disputeRepository.findAllByOrderByCreatedAtDesc();
    }

    private List<SessionDisputeResponse> enrichAll(List<SessionDispute> disputes) {
        if (disputes == null || disputes.isEmpty()) {
            return List.of();
        }
        Set<UUID> sessionIds = disputes.stream().map(SessionDispute::getSessionId).collect(Collectors.toSet());
        Set<UUID> mappingIds = disputes.stream().map(SessionDispute::getMappingId).collect(Collectors.toSet());
        Set<UUID> userIds = disputes.stream()
                .flatMap(d -> java.util.stream.Stream.of(d.getCustomerId(), d.getPtId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, PtMappingSession> sessions = sessionRepository.findAllById(sessionIds).stream()
                .collect(Collectors.toMap(PtMappingSession::getId, Function.identity()));
        Map<UUID, PtClientMapping> mappings = mappingRepository.findAllById(mappingIds).stream()
                .collect(Collectors.toMap(PtClientMapping::getId, Function.identity()));
        Map<UUID, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<UUID> disputeIds = disputes.stream().map(SessionDispute::getId).toList();
        Map<UUID, List<SessionDisputeMessage>> messagesByDispute = messageRepository
                .findByDisputeIdInOrderByCreatedAtAsc(disputeIds).stream()
                .collect(Collectors.groupingBy(SessionDisputeMessage::getDisputeId));

        // Also load message authors
        Set<UUID> authorIds = messagesByDispute.values().stream()
                .flatMap(List::stream)
                .map(SessionDisputeMessage::getAuthorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        authorIds.removeAll(users.keySet());
        if (!authorIds.isEmpty()) {
            userRepository.findAllById(authorIds).forEach(u -> users.put(u.getId(), u));
        }

        List<SessionDisputeResponse> result = new ArrayList<>();
        for (SessionDispute dispute : disputes) {
            result.add(toEnriched(dispute, sessions.get(dispute.getSessionId()),
                    mappings.get(dispute.getMappingId()), users,
                    messagesByDispute.getOrDefault(dispute.getId(), List.of())));
        }
        return result;
    }

    private SessionDisputeResponse enrichOne(SessionDispute dispute) {
        return enrichAll(List.of(dispute)).stream().findFirst()
                .orElse(SessionDisputeResponse.from(dispute));
    }

    private SessionDisputeResponse toEnriched(SessionDispute dispute,
                                              PtMappingSession session,
                                              PtClientMapping mapping,
                                              Map<UUID, User> users,
                                              List<SessionDisputeMessage> messages) {
        SessionDisputeResponse dto = SessionDisputeResponse.from(dispute);
        User customer = users.get(dispute.getCustomerId());
        User pt = users.get(dispute.getPtId());
        dto.setCustomerName(customer != null ? customer.getFullName() : null);
        dto.setPtName(pt != null ? pt.getFullName() : null);
        if (session != null) {
            dto.setSequence(session.getSequence());
            dto.setStartTime(session.getStartTime());
            dto.setEndTime(session.getEndTime());
            dto.setVenueName(session.getVenueName());
            dto.setVenueAddress(session.getVenueAddress());
        }
        if (mapping != null) {
            dto.setPerSessionAmount(mapping.getPerSessionAmount());
        }
        List<SessionDisputeMessageResponse> messageDtos = messages.stream()
                .map(m -> {
                    User author = users.get(m.getAuthorId());
                    String name = author != null ? author.getFullName() : roleFallbackName(m.getAuthorRole());
                    return SessionDisputeMessageResponse.from(m, name);
                })
                .toList();
        dto.setMessages(messageDtos);
        return dto;
    }

    private String roleFallbackName(SessionDisputeAuthorRole role) {
        if (role == null) return "Người dùng";
        return switch (role) {
            case CUSTOMER -> "Khách hàng";
            case PT -> "Huấn luyện viên";
            case ADMIN -> "Admin";
        };
    }

    private void notifyAdmins(String event, Map<String, Object> payload) {
        List<User> admins = userRepository.findByRole(UserRole.ADMIN, Pageable.unpaged()).getContent();
        for (User admin : admins) {
            webSocketSessionService.sendToUser(admin.getId(), event, payload);
        }
    }

    private static String debateNotifyMessage(SessionDisputeAuthorRole role) {
        return switch (role) {
            case CUSTOMER -> "Khách hàng vừa bổ sung ý kiến trong tranh chấp buổi tập.";
            case PT -> "PT vừa phản hồi tranh chấp buổi tập.";
            case ADMIN -> "Admin vừa gửi ghi chú trong tranh chấp buổi tập.";
        };
    }

    private static String decisionLabel(SessionDisputeDecision decision) {
        return switch (decision) {
            case TO_PT -> "Chi tiền cho PT";
            case TO_CUSTOMER -> "Hoàn tiền cho khách";
            case SPLIT -> "Chia tiền";
        };
    }

    private static String buildResolveBody(SessionDisputeDecision decision,
                                           BigDecimal ptAmount,
                                           BigDecimal customerAmount,
                                           String adminNote) {
        return "Quyết định: " + decisionLabel(decision)
                + " — PT: " + ptAmount + "đ, Khách: " + customerAmount + "đ. "
                + adminNote;
    }
}
