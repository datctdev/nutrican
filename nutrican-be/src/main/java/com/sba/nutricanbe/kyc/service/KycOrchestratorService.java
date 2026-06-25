package com.sba.nutricanbe.kyc.service;

import com.sba.nutricanbe.common.entity.EKycSession;
import com.sba.nutricanbe.common.enums.KycDocumentType;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

/**
 * Unified KYC orchestration interface.
 * Gộp full-flow upload (từ KycOrchestratorServiceImpl) và individual-step
 * operations (từ KycOrchestratorImpl / interface cũ KycOrchestrator).
 * Xóa KycOrchestrator interface riêng lẻ — dùng interface này làm điểm duy nhất.
 */
public interface KycOrchestratorService {

    // ── Full-flow upload (new workflow) ──────────────────────────────────────
    Map<String, Object> uploadFileAndAttach(
            UUID sessionId,
            UUID userId,
            MultipartFile file,
            String title,
            String description
    );

    // ── Session lifecycle ────────────────────────────────────────────────────
    UUID start(UUID accountId);

    EKycSession get(UUID sessionId, UUID accountId);

    // ── Individual step operations (step-by-step workflow) ──────────────────
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
