package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.CoachingHistoryDto;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;

import java.util.List;
import java.util.UUID;

public interface CoachingLifecycleService {

    PtClientMappingResponse requestEndCoaching(UUID actorId, UUID clientId, boolean actorIsPt);

    PtClientMappingResponse confirmEndCoaching(UUID actorId, UUID clientId, boolean actorIsPt);

    List<CoachingHistoryDto> getCoachingHistory(UUID customerId);

    void setMaxClients(UUID ptUserId, Integer maxClients);
}
