package com.sba.nutricanbe.common.repository;

import com.sba.nutricanbe.common.entity.EKycSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KycSessionRepository extends JpaRepository<EKycSession, UUID> {

    Optional<EKycSession> findByIdAndUserId(UUID id, UUID userId);
}

