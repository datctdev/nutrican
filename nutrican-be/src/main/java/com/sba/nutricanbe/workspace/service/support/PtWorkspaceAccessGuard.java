package com.sba.nutricanbe.workspace.service.support;

import com.sba.nutricanbe.common.exception.ForbiddenException;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;


@Component
@RequiredArgsConstructor
public class PtWorkspaceAccessGuard {

    private final PtClientMappingRepository mappingRepository;

    private static final List<ClientMappingStatus> COACHING_OPEN = List.of(
            ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED);

    public void assertActiveMapping(UUID ptId, UUID clientId) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(ptId, clientId, COACHING_OPEN)) {
            throw new ForbiddenException("Học viên này chưa được gán hoạt động với bạn");
        }
    }

    public PtClientMapping requireActiveMapping(UUID ptId, UUID clientId) {
        return mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, clientId)
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE
                        || m.getStatus() == ClientMappingStatus.END_REQUESTED)
                .orElseThrow(() -> new ForbiddenException("Học viên này chưa được gán hoạt động với bạn"));
    }

    /** Alias — ACTIVE or END_REQUESTED (wind-down still coaching). */
    public PtClientMapping requireActiveOrEndRequested(UUID ptId, UUID clientId) {
        return requireActiveMapping(ptId, clientId);
    }

    public void requirePtClientDataAccess(UUID ptId, UUID clientId) {
        PtClientMapping mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, clientId)
                .orElseThrow(() -> new ForbiddenException("Không có quan hệ coaching với học viên này"));
        if (mapping.getStatus() == ClientMappingStatus.INACTIVE
                || mapping.getStatus() == ClientMappingStatus.PENDING) {
            throw new ForbiddenException("Bạn không có quyền xem dữ liệu học viên này");
        }
    }
}
