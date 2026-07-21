package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.dto.response.SosTicketResponse;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.service.PtSosService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtSosServiceImpl implements PtSosService {

    private static final int MIN_RESOLUTION_NOTE_LENGTH = 20;

    private final SosTicketRepository sosTicketRepository;
    private final UserQueryService userQueryService;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<SosTicketResponse>> getSosTickets(UUID ptId) {
        List<SosTicketResponse> tickets = sosTicketRepository
                .findByPt_Id(ptId, PageRequest.of(0, 50, Sort.by("createdAt").descending()))
                .map(this::toSosResponse).getContent();
        return ApiResponse.success(tickets);
    }

    @Override
    @Transactional
    public ApiResponse<Void> resolveSosTicket(UUID ticketId, UUID ptId, String note) {
        SosTicket ticket = sosTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SOS Ticket", ticketId));
        if (ticket.getPtId() == null || !ticket.getPtId().equals(ptId)) {
            throw new BadRequestException("You can only resolve tickets assigned to you");
        }
        String resolutionNote = note != null ? note.trim() : "";
        if (resolutionNote.length() < MIN_RESOLUTION_NOTE_LENGTH) {
            throw new BadRequestException("resolutionNote must be at least 20 characters");
        }
        ticket.setStatus(SosTicketStatus.RESOLVED);
        ticket.setResolutionNote(resolutionNote);
        ticket.setResolvedAt(LocalDateTime.now());
        sosTicketRepository.save(ticket);

        if (ticket.getDietLog() != null && ticket.getDietLog().getCustomerId() != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("ticketId", ticketId);
            payload.put("status", "RESOLVED");
            payload.put("resolutionNote", resolutionNote);
            webSocketSessionService.sendToUser(ticket.getDietLog().getCustomerId(), "SOS_RESOLVED", payload);
        }
        return ApiResponse.success(null, "SOS ticket resolved");
    }

    private SosTicketResponse toSosResponse(SosTicket ticket) {
        return SosTicketResponse.builder()
                .id(ticket.getId())
                .dietLogId(ticket.getDietLog() != null ? ticket.getDietLog().getId() : null)
                .note(ticket.getNote())
                .resolutionNote(ticket.getResolutionNote())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .reasonCode(ticket.getReasonCode())
                .mealSource(ticket.getMealSource())
                .autoCreated(ticket.getAutoCreated())
                .customerName(ticket.getDietLog() != null
                        ? userQueryService.findUserById(ticket.getDietLog().getCustomerId())
                                .map(User::getFullName).orElse(null)
                        : null)
                .ptName(ticket.getPtId() != null
                        ? userQueryService.findUserById(ticket.getPtId()).map(User::getFullName).orElse(null)
                        : null)
                .createdAt(ticket.getCreatedAt())
                .assignedAt(ticket.getAssignedAt())
                .firstResponseAt(ticket.getFirstResponseAt())
                .resolvedAt(ticket.getResolvedAt())
                .slaBreached(ticket.getSlaBreached())
                .escalationCount(ticket.getEscalationCount())
                .build();
    }
}
