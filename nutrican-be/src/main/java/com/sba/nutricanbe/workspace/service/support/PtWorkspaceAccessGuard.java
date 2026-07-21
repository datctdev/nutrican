package com.sba.nutricanbe.workspace.service.support;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Shared guard for PT workspace services: verifies a PT is allowed to act on / read a client's data.
 */
@Component
@RequiredArgsConstructor
public class PtWorkspaceAccessGuard {

    private final PtClientMappingRepository mappingRepository;

    public void assertActiveMapping(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE)) {
            throw new BadRequestException("Client not active for this PT");
        }
    }

    public void requirePtClientDataAccess(UUID ptId, UUID clientId) {
        PtClientMapping mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, clientId)
                .orElseThrow(() -> new BadRequestException("No mapping with this client"));
        if (mapping.getStatus() == ClientMappingStatus.INACTIVE
                || mapping.getStatus() == ClientMappingStatus.PENDING) {
            throw new UnauthorizedException("No access to this client data");
        }
    }
}
