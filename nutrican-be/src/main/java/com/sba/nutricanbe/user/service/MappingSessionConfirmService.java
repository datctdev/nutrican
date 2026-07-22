package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeMessageRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeResponse;
import com.sba.nutricanbe.user.dto.SessionDisputeRequest;
import com.sba.nutricanbe.user.dto.SessionDisputeReviewRequest;

import java.util.List;
import java.util.UUID;

public interface MappingSessionConfirmService {

    MappingSessionResponse markDone(UUID ptUserId, UUID sessionId);

    MappingSessionResponse confirmByCustomer(UUID customerId, UUID sessionId);

    MappingSessionResponse disputeByCustomer(UUID customerId, UUID sessionId, SessionDisputeRequest request);

    MappingSessionResponse autoConfirmExpired(UUID sessionId);

    List<SessionDisputeResponse> listDisputes(String status);

    List<SessionDisputeResponse> listDisputesForPt(UUID ptUserId, String status);

    List<SessionDisputeResponse> listDisputesForCustomer(UUID customerId, String status);

    SessionDisputeResponse addDisputeMessage(UUID userId, UUID disputeId, SessionDisputeMessageRequest request,
                                             boolean asAdmin);

    SessionDisputeResponse resolveDispute(UUID adminId, UUID disputeId, SessionDisputeReviewRequest request);

    int autoConfirmOverdueSessions();

    List<MappingSessionResponse> listSessionsForCustomer(UUID customerId);

    long countPendingDisputes();
}
