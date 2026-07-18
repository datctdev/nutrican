package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PtWorkspaceClientDietLogTest {

    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private DietLogRepository dietLogRepository;

    @InjectMocks
    private PtWorkspaceServiceImpl ptWorkspaceService;

    @Test
    void returnsApprovedLogsForRequestedActiveClient() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatus(
                ptId, clientId, ClientMappingStatus.ACTIVE)).thenReturn(true);
        when(dietLogRepository.findByCustomerIdInAndReviewStatus(
                eq(List.of(clientId)),
                eq(DietLogReviewStatus.APPROVED),
                any(Pageable.class))).thenReturn(Page.empty());

        ptWorkspaceService.getClientDietLogs(
                ptId, clientId, 0, 20, DietLogReviewStatus.APPROVED);

        verify(dietLogRepository).findByCustomerIdInAndReviewStatus(
                eq(List.of(clientId)),
                eq(DietLogReviewStatus.APPROVED),
                any(Pageable.class));
    }

    @Test
    void rejectsHistoryForClientOutsideActiveMapping() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatus(
                ptId, clientId, ClientMappingStatus.ACTIVE)).thenReturn(false);

        assertThrows(BadRequestException.class, () -> ptWorkspaceService.getClientDietLogs(
                ptId, clientId, 0, 20, DietLogReviewStatus.APPROVED));

        verify(dietLogRepository, never()).findByCustomerIdInAndReviewStatus(
                any(), any(), any(Pageable.class));
    }
}
