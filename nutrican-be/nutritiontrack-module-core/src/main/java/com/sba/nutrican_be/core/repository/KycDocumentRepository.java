package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.EKycDocument;
import com.sba.nutrican_be.core.enums.KycDocumentType;
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

