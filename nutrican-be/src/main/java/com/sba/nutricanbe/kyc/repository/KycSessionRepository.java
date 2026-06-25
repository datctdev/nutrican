package com.sba.nutricanbe.kyc.repository;

import com.sba.nutricanbe.kyc.entity.EkycSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KycSessionRepository extends JpaRepository<EkycSession, UUID> {

    Optional<EkycSession> findByIdAndUserId(UUID id, UUID userId);
}

