package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.CoachingEndRequestedBy;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoachingLifecycleServiceTest {

    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private PtProfileRepository ptProfileRepository;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    @Mock private SelfPlanItemRepository selfPlanItemRepository;
    @Mock private com.sba.nutricanbe.user.service.NotificationService notificationService;
    @InjectMocks private CoachingLifecycleServiceImpl service;

    @Test
    void requestEndCoaching_setsEndRequested() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        User pt = mock(User.class);
        User client = mock(User.class);
        PtClientMapping mapping = PtClientMapping.builder().pt(pt).client(client).status(ClientMappingStatus.ACTIVE).build();
        when(client.getId()).thenReturn(clientId);
        when(mappingRepository.findByPt_IdAndClient_Id(ptId, clientId)).thenReturn(Optional.of(mapping));
        when(mappingRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = service.requestEndCoaching(ptId, clientId, true);
        assertThat(result.getStatus()).isEqualTo(ClientMappingStatus.END_REQUESTED);
        assertThat(mapping.getEndRequestedBy()).isEqualTo(CoachingEndRequestedBy.PT);
    }

    @Test
    void confirmEndCoaching_completesWhenOtherPartyConfirms() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        User pt = mock(User.class);
        User client = mock(User.class);
        PtClientMapping mapping = PtClientMapping.builder().pt(pt).client(client).status(ClientMappingStatus.END_REQUESTED).build();
        when(pt.getId()).thenReturn(ptId);
        when(client.getId()).thenReturn(clientId);
        mapping.setEndRequestedBy(CoachingEndRequestedBy.PT);
        when(mappingRepository.findFirstByClient_IdAndStatus(clientId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(mappingRepository.findFirstByClient_IdAndStatus(clientId, ClientMappingStatus.END_REQUESTED))
                .thenReturn(Optional.of(mapping));
        when(selfPlanSubmissionRepository.findByCustomerIdAndPtIdAndStatus(
                eq(clientId), eq(ptId), eq(com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus.PENDING)))
                .thenReturn(java.util.List.of());
        when(mappingRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = service.confirmEndCoaching(clientId, clientId, false);
        assertThat(result.getStatus()).isEqualTo(ClientMappingStatus.COMPLETED);
    }

    @Test
    void setMaxClients_rejectsOutOfRange() {
        assertThatThrownBy(() -> service.setMaxClients(UUID.randomUUID(), 25))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void setMaxClients_updatesProfile() {
        UUID ptId = UUID.randomUUID();
        when(ptProfileRepository.findByUserId(ptId)).thenReturn(Optional.of(PtProfile.builder().maxClients(10).build()));
        service.setMaxClients(ptId, 15);
        verify(ptProfileRepository).save(any());
    }
}
