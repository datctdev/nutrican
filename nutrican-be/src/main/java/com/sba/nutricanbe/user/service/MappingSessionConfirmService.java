package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeReviewRequest;

import java.util.List;
import java.util.UUID;

public interface MappingSessionConfirmService {

    MappingSessionResponse markDone(UUID ptUserId, UUID sessionId);

    MappingSessionResponse confirmByCustomer(UUID customerId, UUID sessionId);

    MappingSessionResponse disputeByCustomer(UUID customerId, UUID sessionId, SessionDisputeRequest request);

    MappingSessionResponse autoConfirmExpired(UUID sessionId);

    List<SessionDisputeResponse> listDisputes(String status);

    SessionDisputeResponse resolveDispute(UUID disputeId, SessionDisputeReviewRequest request);

    int autoConfirmOverdueSessions();

    List<MappingSessionResponse> listSessionsForCustomer(UUID customerId);
}
