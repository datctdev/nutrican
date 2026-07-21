package com.sba.nutricanbe.kyc.service;

import com.sba.nutricanbe.kyc.entity.EkycSession;
import com.sba.nutricanbe.common.enums.KycDocumentType;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

/** Orchestrates KYC session lifecycle and VNPT document steps. */
public interface KycOrchestratorService {

    Map<String, Object> uploadFileAndAttach(
            UUID sessionId,
            UUID userId,
            MultipartFile file,
            String title,
            String description
    );

    UUID start(UUID accountId);

    EkycSession get(UUID sessionId, UUID accountId);

    String uploadToVnptAndAttach(
            UUID sessionId,
            UUID accountId,
            KycDocumentType type,
            MultipartFile file,
            String title,
            String description
    );

    void attachFile(
            UUID sessionId,
            UUID accountId,
            KycDocumentType type,
            String fileHash
    );

    Map<String, Object> classify(UUID sessionId, UUID accountId, String fileHash);

    Map<String, Object> ocrFront(UUID sessionId, UUID accountId, String fileHash, int type);

    Map<String, Object> ocrBack(UUID sessionId, UUID accountId, String fileHash, int type);

    Map<String, Object> liveness(UUID sessionId, UUID accountId, String fileHash);

    Map<String, Object> compare(UUID sessionId, UUID accountId);
}
