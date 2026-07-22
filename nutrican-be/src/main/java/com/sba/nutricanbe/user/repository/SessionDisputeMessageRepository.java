package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.SessionDisputeMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SessionDisputeMessageRepository extends JpaRepository<SessionDisputeMessage, UUID> {

    List<SessionDisputeMessage> findByDisputeIdOrderByCreatedAtAsc(UUID disputeId);

    List<SessionDisputeMessage> findByDisputeIdInOrderByCreatedAtAsc(List<UUID> disputeIds);
}
