package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.user.dto.CoachingHistoryDto;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.CoachingEndRequestedBy;
import com.sba.nutricanbe.user.enums.TerminationReason;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.service.CoachingLifecycleService;
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
public class CoachingLifecycleServiceImpl implements CoachingLifecycleService {

    private final PtClientMappingRepository mappingRepository;
    private final PtProfileRepository ptProfileRepository;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional
    public PtClientMappingResponse requestEndCoaching(UUID actorId, UUID clientId, boolean actorIsPt) {
        PtClientMapping mapping = resolveActiveMapping(actorId, clientId, actorIsPt);
        if (mapping.getStatus() == ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("End coaching already requested");
        }
        mapping.setStatus(ClientMappingStatus.END_REQUESTED);
        mapping.setEndRequestedBy(actorIsPt ? CoachingEndRequestedBy.PT : CoachingEndRequestedBy.CUSTOMER);
        mapping.setEndRequestedAt(LocalDateTime.now());
        mapping = mappingRepository.save(mapping);
        notifyEndCoachingRequest(mapping, actorIsPt);
        return PtClientMappingResponse.toMappingResponse(mapping);
    }

    private void notifyEndCoachingRequest(PtClientMapping mapping, boolean actorIsPt) {
        UUID recipientId = actorIsPt ? mapping.getClient().getId() : mapping.getPt().getId();
        Map<String, Object> payload = new HashMap<>();
        payload.put("mappingId", mapping.getId());
        payload.put("clientId", mapping.getClient().getId());
        payload.put("requestedBy", actorIsPt ? "PT" : "CUSTOMER");
        webSocketSessionService.sendToUser(recipientId, "COACHING_END_REQUESTED", payload);
    }

    @Override
    @Transactional
    public PtClientMappingResponse confirmEndCoaching(UUID actorId, UUID clientId, boolean actorIsPt) {
        PtClientMapping mapping = resolveActiveMapping(actorId, clientId, actorIsPt);
        if (mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("No pending end coaching request");
        }
        CoachingEndRequestedBy requester = mapping.getEndRequestedBy();
        if (requester == null) {
            throw new BadRequestException("Invalid end request state");
        }
        boolean confirmByPt = actorIsPt;
        boolean confirmByCustomer = !actorIsPt;
        if (requester == CoachingEndRequestedBy.PT && confirmByPt) {
            throw new BadRequestException("Waiting for customer confirmation");
        }
        if (requester == CoachingEndRequestedBy.CUSTOMER && confirmByCustomer) {
            throw new BadRequestException("Waiting for PT confirmation");
        }
        mapping.setStatus(ClientMappingStatus.COMPLETED);
        mapping.setCompletedAt(LocalDateTime.now());
        mapping.setTerminationReason(TerminationReason.NORMAL_COMPLETION);
        return PtClientMappingResponse.toMappingResponse(mappingRepository.save(mapping));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CoachingHistoryDto> getCoachingHistory(UUID customerId) {
        return mappingRepository.findByClient_IdAndStatusOrderByCompletedAtDesc(
                        customerId, ClientMappingStatus.COMPLETED).stream()
                .map(m -> CoachingHistoryDto.builder()
                        .mappingId(m.getId())
                        .ptId(m.getPt().getId())
                        .ptName(m.getPt().getFullName())
                        .status(m.getStatus())
                        .completedAt(m.getCompletedAt())
                        .assignedAt(m.getAssignedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void setMaxClients(UUID ptUserId, int maxClients) {
        if (maxClients < 1 || maxClients > 20) {
            throw new BadRequestException("maxClients must be between 1 and 20");
        }
        PtProfile profile = ptProfileRepository.findByUserId(ptUserId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptUserId));
        profile.setMaxClients(maxClients);
        ptProfileRepository.save(profile);
    }

    private PtClientMapping resolveActiveMapping(UUID actorId, UUID clientId, boolean actorIsPt) {
        PtClientMapping mapping;
        if (actorIsPt) {
            mapping = mappingRepository.findByPt_IdAndClient_Id(actorId, clientId)
                    .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", clientId));
            if (mapping.getStatus() != ClientMappingStatus.ACTIVE
                    && mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
                throw new BadRequestException("Client not active for this PT");
            }
        } else {
            if (!actorId.equals(clientId)) {
                throw new UnauthorizedException("Cannot act on another customer");
            }
            mapping = mappingRepository.findFirstByClient_IdAndStatus(clientId, ClientMappingStatus.ACTIVE)
                    .or(() -> mappingRepository.findFirstByClient_IdAndStatus(clientId, ClientMappingStatus.END_REQUESTED))
                    .orElseThrow(() -> new BadRequestException("No active coaching relationship"));
        }
        return mapping;
    }
}
