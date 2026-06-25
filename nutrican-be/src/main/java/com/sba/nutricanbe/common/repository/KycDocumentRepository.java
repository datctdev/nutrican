package com.sba.nutricanbe.common.repository;

import com.sba.nutricanbe.common.entity.EKycDocument;
import com.sba.nutricanbe.common.enums.KycDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KycDocumentRepository extends JpaRepository<EKycDocument, UUID> {
    Optional<EKycDocument> findBySessionIdAndType(
            UUID sessionId,
            KycDocumentType type
    );
}

