package com.sba.nutrican_be.admin.service.impl;

import com.sba.nutrican_be.admin.dto.SosTicketAdminResponse;
import com.sba.nutrican_be.admin.service.SosAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.SOSTicketRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SosAdminServiceImpl implements SosAdminService {

    private final SOSTicketRepository sosTicketRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<SosTicketAdminResponse>> getSosTickets(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SOSTicket> ticketPage;

        if (status != null) {
            ticketPage = sosTicketRepository.findByStatus(
                    SOSTicketStatus.valueOf(status), pageable);
        } else {
            ticketPage = sosTicketRepository.findByStatusIn(
                    List.of(SOSTicketStatus.OPEN, SOSTicketStatus.ASSIGNED), pageable);
        }

        return ApiResponse.success(PageResponse.from(ticketPage.map(this::toResponse)));
    }

    @Override
    @Transactional
    public ApiResponse<Void> assignSosTicket(UUID ticketId, UUID ptId, UUID adminId) {
        SOSTicket ticket = sosTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SOS Ticket", ticketId));

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", adminId));

        ticket.setPt(pt);
        ticket.setAssignedBy(admin);
        ticket.setStatus(SOSTicketStatus.ASSIGNED);
        sosTicketRepository.save(ticket);

        log.info("SOS ticket {} assigned to PT {}", ticketId, ptId);
        return ApiResponse.success(null, "SOS ticket assigned");
    }

    @Override
    @Transactional
    public ApiResponse<Void> closeSosTicket(UUID ticketId) {
        SOSTicket ticket = sosTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SOS Ticket", ticketId));
        ticket.setStatus(SOSTicketStatus.CLOSED);
        sosTicketRepository.save(ticket);
        return ApiResponse.success(null, "SOS ticket closed");
    }

    private SosTicketAdminResponse toResponse(SOSTicket ticket) {
        return SosTicketAdminResponse.builder()
                .id(ticket.getId())
                .dietLogId(ticket.getDietLog() != null ? ticket.getDietLog().getId() : null)
                .note(ticket.getNote())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .customerName(ticket.getDietLog() != null && ticket.getDietLog().getCustomer() != null
                        ? ticket.getDietLog().getCustomer().getFullName() : null)
                .ptName(ticket.getPt() != null ? ticket.getPt().getFullName() : null)
                .createdAt(ticket.getCreatedAt())
                .build();
    }
}
