package com.sba.nutricanbe.kyc.repository;

import com.sba.nutricanbe.kyc.entity.EkycDocument;
import com.sba.nutricanbe.common.enums.KycDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KycDocumentRepository extends JpaRepository<EkycDocument, UUID> {
    Optional<EkycDocument> findBySessionIdAndType(
            UUID sessionId,
            KycDocumentType type
    );
}

