package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.SosTicketResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.enums.SosReasonCode;
import com.sba.nutricanbe.common.event.SosTicketCreatedEvent;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.diet.dto.CreateSosRequest;
import com.sba.nutricanbe.diet.service.SosService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SosServiceImpl implements SosService {

    @Value("${ai.recognition.confidence-threshold:0.25}")
    private BigDecimal confidenceThreshold;

    private final SosTicketRepository sosTicketRepository;
    private final DietLogRepository dietLogRepository;
    private final UserRepository userRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public ApiResponse<Void> createSosTicket(UUID customerId, CreateSosRequest request) {
        userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", customerId));

        DietLog dietLog = null;
        if (request.getDietLogId() != null) {
            dietLog = dietLogRepository.findById(request.getDietLogId())
                    .orElseThrow(() -> new ResourceNotFoundException("DietLog", request.getDietLogId()));
            if (!dietLog.getCustomer().getId().equals(customerId)) {
                throw new BadRequestException("You can only create SOS for your own diet logs");
            }
            dietLog.setSosTicketFlag(true);
            dietLogRepository.save(dietLog);
        }

        SosReasonCode reasonCode = request.getReasonCode();
        if (reasonCode == null && dietLog != null) {
            reasonCode = resolveAutoSosReason(dietLog);
        }

        SosTicket ticket = SosTicket.builder()
                .dietLog(dietLog)
                .priority(request.getPriority() != null ? request.getPriority() : "HIGH")
                .note(request.getNote())
                .status(SosTicketStatus.OPEN)
                .reasonCode(reasonCode)
                .mealSource(request.getMealSource() != null ? request.getMealSource() : (dietLog != null ? dietLog.getMealSource() : null))
                .autoCreated(request.getAutoCreated() != null ? request.getAutoCreated() : (reasonCode != null && request.getReasonCode() == null))
                .build();

        sosTicketRepository.save(ticket);
        notifyPtOfSos(customerId, request.getPriority() != null ? request.getPriority() : "HIGH");
        log.info("SOS ticket created by user: {}", customerId);
        return ApiResponse.success(null, "SOS ticket created, your PT has been notified");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<SosTicketResponse>> getSosTickets(UUID customerId) {
        List<SosTicketResponse> tickets = sosTicketRepository.findByCustomerId(customerId).stream()
                .map(this::toSosResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(tickets, "SOS tickets retrieved");
    }

    private SosReasonCode resolveAutoSosReason(DietLog dietLog) {
        if (dietLog.getMealComplexity() == MealComplexity.HOTPOT) {
            return SosReasonCode.HOTPOT_HELP;
        }
        if (dietLog.getAiConfidenceScore() != null
                && dietLog.getAiConfidenceScore().compareTo(confidenceThreshold) < 0) {
            return SosReasonCode.LOW_CONFIDENCE;
        }
        if (dietLog.getFoodItemId() == null) {
            return SosReasonCode.UNKNOWN_FOOD;
        }
        if (dietLog.getAiRawJson() != null) {
            Object reasons = dietLog.getAiRawJson().get("uncertaintyReasons");
            if (reasons instanceof List<?> list && !list.isEmpty()) {
                String joined = list.stream().map(Object::toString).map(String::toLowerCase).reduce("", String::concat);
                if (joined.contains("portion")) {
                    return SosReasonCode.PORTION_UNCLEAR;
                }
            }
        }
        return SosReasonCode.USER_REQUEST;
    }

    private void notifyPtOfSos(UUID customerId, String priority) {
        findActivePt(customerId).ifPresent(mapping -> {
            User client = mapping.getClient();
            eventPublisher.publishEvent(new SosTicketCreatedEvent(
                    this,
                    mapping.getPt().getId(),
                    client.getId(),
                    client.getFullName(),
                    priority
            ));
        });
    }

    private Optional<PtClientMapping> findActivePt(UUID customerId) {
        return ptClientMappingRepository.findByClient_Id(customerId, PageRequest.of(0, 1))
                .getContent().stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .findFirst();
    }

    private SosTicketResponse toSosResponse(SosTicket ticket) {
        return SosTicketResponse.builder()
                .id(ticket.getId())
                .dietLogId(ticket.getDietLog() != null ? ticket.getDietLog().getId() : null)
                .note(ticket.getNote())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .reasonCode(ticket.getReasonCode())
                .mealSource(ticket.getMealSource())
                .autoCreated(ticket.getAutoCreated())
                .customerName(ticket.getDietLog() != null && ticket.getDietLog().getCustomer() != null
                        ? ticket.getDietLog().getCustomer().getFullName() : null)
                .ptName(ticket.getPt() != null ? ticket.getPt().getFullName() : null)
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
