package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.common.enums.RequestStatus;
import com.sba.nutricanbe.user.entity.PtUpdateRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PtUpdateRequestRepository extends JpaRepository<PtUpdateRequest, UUID> {
    boolean existsByPtIdAndStatus(UUID ptId, RequestStatus status);
    Optional<PtUpdateRequest> findFirstByPtIdAndStatusOrderByCreatedAtDesc(UUID ptId, RequestStatus status);
}