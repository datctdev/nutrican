package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.SessionDispute;
import com.sba.nutricanbe.user.enums.SessionDisputeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionDisputeRepository extends JpaRepository<SessionDispute, UUID> {

    Optional<SessionDispute> findBySessionId(UUID sessionId);

    List<SessionDispute> findByStatusOrderByCreatedAtDesc(SessionDisputeStatus status);

    List<SessionDispute> findAllByOrderByCreatedAtDesc();

    List<SessionDispute> findByPtIdOrderByCreatedAtDesc(UUID ptId);

    List<SessionDispute> findByPtIdAndStatusOrderByCreatedAtDesc(UUID ptId, SessionDisputeStatus status);

    List<SessionDispute> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<SessionDispute> findByCustomerIdAndStatusOrderByCreatedAtDesc(UUID customerId, SessionDisputeStatus status);

    long countByStatus(SessionDisputeStatus status);

    long countByMappingIdAndStatus(UUID mappingId, SessionDisputeStatus status);
}
