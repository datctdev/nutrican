package com.sba.nutricanbe.kyc.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.kyc.dto.response.*;
import com.sba.nutricanbe.kyc.entity.EkycDocument;
import com.sba.nutricanbe.kyc.entity.EkycSession;
import com.sba.nutricanbe.kyc.repository.KycDocumentRepository;
import com.sba.nutricanbe.kyc.repository.KycSessionRepository;
import com.sba.nutricanbe.kyc.service.KycOrchestratorService;
import com.sba.nutricanbe.kyc.service.UploadFileService;
import com.sba.nutricanbe.kyc.service.CardLivenessService;
import com.sba.nutricanbe.kyc.service.CardClassifyService;
import com.sba.nutricanbe.kyc.service.KycSessionAttachService;
import com.sba.nutricanbe.kyc.valueobject.AttachDecision;
import com.sba.nutricanbe.kyc.valueobject.ClassifyResult;
import com.sba.nutricanbe.kyc.valueobject.CardLivenessResult;
import com.sba.nutricanbe.kyc.client.VnptClient;
import com.sba.nutricanbe.common.enums.KycDocumentType;
import com.sba.nutricanbe.common.enums.KycStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Primary
@RequiredArgsConstructor
public class KycOrchestratorImpl implements KycOrchestratorService {
    private static final Logger log = LoggerFactory.getLogger(KycOrchestratorImpl.class);

    private final KycSessionRepository sessions;
    private final KycDocumentRepository docs;
    private final VnptClient vnpt;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    // Full-flow upload services (used by uploadFileAndAttach)
    private final UploadFileService uploadFileService;
    private final CardClassifyService cardClassifyService;
    private final CardLivenessService cardLivenessService;
    private final KycSessionAttachService kycSessionAttachService;

    private static final Map<String, Integer> TITLE_TO_TYPE = Map.of(
            "FRONT", 0, "BACK", 1, "SIDE", 2, "FACE", 3, "SELFIE", 4
    );

    @Override
    public Map<String, Object> uploadFileAndAttach(
            UUID sessionId, UUID userId, MultipartFile file, String title, String description) {
        String hash = uploadFileService.upload(file, title, description);
        if (hash == null || hash.isBlank()) {
            return Map.of("ok", false, "step", "UPLOAD", "fileHash", "", "reason", "Empty hash from upload");
        }
        ClassifyResult cls = cardClassifyService.classify(hash, sessionId.toString());
        if (cls == null || cls.name() == null || cls.name().isBlank()) {
            return Map.of("ok", false, "step", "CLASSIFY", "fileHash", hash, "reason", "Classify returned empty name");
        }
        boolean hasValidTitle = title != null && !title.isBlank() && TITLE_TO_TYPE.containsKey(title.toUpperCase().trim());
        Integer type = hasValidTitle ? TITLE_TO_TYPE.get(title.toUpperCase().trim()) : cls.type();
        String name = hasValidTitle ? title.toUpperCase().trim() : cls.name();

        if (type != null && type >= 0 && type <= 3) {
            CardLivenessResult live = cardLivenessService.verify(hash, sessionId.toString());
            if (live == null || !live.isReal()) {
                return Map.of("ok", false, "step", "CARD_LIVENESS", "fileHash", hash,
                        "classifiedName", name, "classifiedType", type,
                        "liveness", live != null ? live.liveness() : "",
                        "livenessMsg", live != null ? live.livenessMsg() : "");
            }
        } else if (type == null || type != 4) {
            return Map.of("ok", false, "step", "ROUTE_UNSUPPORTED", "fileHash", hash,
                    "classifiedName", name != null ? name : "", "classifiedType", type != null ? type : -1,
                    "reason", "Unsupported classify type");
        }
        String attachName = (title != null && !title.isBlank()) ? title.toUpperCase().trim() : name;
        AttachDecision decision = kycSessionAttachService.attachFile(sessionId, userId, hash, attachName);
        if (decision == null || !decision.attached()) {
            return Map.of("ok", false, "step", "ATTACH", "fileHash", hash,
                    "classifiedName", name != null ? name : "", "classifiedType", type != null ? type : -1,
                    "reason", decision != null ? decision.reason() : "ATTACH_DECISION_NULL");
        }
        return Map.of("ok", true, "fileHash", hash,
                "classifiedName", name != null ? name : "", "classifiedType", type != null ? type : -1,
                "classifiedConfidence", cls.confidence() != null ? cls.confidence() : 0.0,
                "savedTo", decision.savedTo() != null ? decision.savedTo() : "");
    }

    public String uploadToVnptAndAttach(
            UUID sessionId,
            UUID accountId,
            KycDocumentType type,
            MultipartFile file,
            String title,
            String description
    ) {

        UploadResponse up = vnpt.addFile(file, title, description);
        String hash = up.getObject().getHash();

        attachFile(sessionId, accountId, type, hash);

        return hash;
    }

    public UUID start(UUID userId) {
        EkycSession s = new EkycSession();
        s.setUserId(userId);
        s.setStatus(KycStatus.DRAFT);
        sessions.save(s);
        return s.getId();
    }

    public void attachFile(UUID sessionId,
                           UUID accountId,
                           KycDocumentType type,
                           String fileHash) {

        EkycSession s = get(sessionId, accountId);

        if (type == KycDocumentType.FRONT) {
            s.setFrontHash(fileHash);
        } else if (type == KycDocumentType.BACK) {
            s.setBackHash(fileHash);
        } else if (type == KycDocumentType.SELFIE) {
            s.setSelfieHash(fileHash);
        }

        // tối giản: cứ attach xong là IN_PROGRESS
        s.setStatus(KycStatus.IN_PROGRESS);
        sessions.save(s);

        EkycDocument doc = new EkycDocument();
        doc.setSessionId(s.getId());
        doc.setType(type);
        doc.setFileHash(fileHash);
        docs.save(doc);
    }

    public Map<String, Object> classify(UUID sessionId, UUID accountId, String fileHash) {
        String activeHash = (fileHash != null && !fileHash.isBlank())
                ? fileHash
                : getActiveHash(sessionId, accountId, KycDocumentType.FRONT);

        if (activeHash == null || activeHash.isBlank()) {
            throw new IllegalStateException("No active front file hash found");
        }

        ClassifyResponse res = vnpt.classify(activeHash, sessionId.toString());

        Map<String, Object> out = new HashMap<>();
        out.put("name", res.getObj() != null ? res.getObj().getName() : null);
        out.put("confidence", res.getObj() != null ? res.getObj().getConfidence() : null);
        out.put("source", "LIVE");
        out.put("type", res.getObj() != null ? res.getObj().getType() : null);
        return out;
    }

    public Map<String, Object> ocrFront(UUID sessionId, UUID accountId, String fileHash, int type) {
        String activeHash = (fileHash != null && !fileHash.isBlank())
                ? fileHash
                : getActiveHash(sessionId, accountId, KycDocumentType.FRONT);

        if (activeHash == null || activeHash.isBlank()) {
            throw new IllegalStateException("No active front file hash found");
        }

        OcrFrontResponse res = vnpt.ocrFront(activeHash, type, sessionId.toString());

        log.info("VNPT OCR Front ok. sessionId={}, hasObj={}", sessionId, res.getObj() != null);

        OcrFrontResponse.Obj o = res.getObj();
        Map<String, Object> out = new HashMap<>();
        out.put("idNumber", o != null ? o.getId() : null);
        out.put("fullName", o != null ? o.getName() : null);
        out.put("birthDay", o != null ? o.getBirthDay() : null);
        out.put("cardType", o != null ? o.getCardType() : null);
        out.put("nationality", o != null ? o.getNationality() : null);
        out.put("gender", o != null ? o.getGender() : null);
        out.put("recentLocation", o != null ? o.getRecentLocation() : null);
        out.put("originLocation", o != null ? o.getOriginLocation() : null);
        out.put("issueDate", o != null ? o.getIssueDate() : null);
        out.put("issuePlace", o != null ? o.getIssuePlace() : null);
        out.put("validDate", o != null ? o.getValidDate() : null);
        out.put("typeId", o != null ? o.getTypeId() : null);
        out.put("source", "LIVE");
        return out;
    }

    public Map<String, Object> ocrBack(UUID sessionId, UUID accountId, String fileHash, int type) {
        String activeHash = (fileHash != null && !fileHash.isBlank())
                ? fileHash
                : getActiveHash(sessionId, accountId, KycDocumentType.BACK);

        if (activeHash == null || activeHash.isBlank()) {
            throw new IllegalStateException("No active back file hash found");
        }

        OcrBackResponse res = vnpt.ocrBack(activeHash, type, sessionId.toString());

        OcrBackResponse.Obj o = res.getObj();
        Map<String, Object> out = new HashMap<>();
        out.put("issueDate", o != null ? o.getIssueDate() : null);
        out.put("issuePlace", o != null ? o.getIssuePlace() : null);
        out.put("backTypeId", o != null ? o.getBackTypeId() : null);
        out.put("msgBack", o != null ? o.getMsgBack() : null);
        out.put("source", "LIVE");
        return out;
    }

    public Map<String, Object> liveness(UUID sessionId, UUID accountId, String fileHash) {
        String activeHash = (fileHash != null && !fileHash.isBlank())
                ? fileHash
                : getActiveHash(sessionId, accountId, KycDocumentType.SELFIE);

        if (activeHash == null || activeHash.isBlank()) {
            throw new IllegalStateException("No active selfie file hash found");
        }

        LivenessResponse res = vnpt.liveness(activeHash, sessionId.toString());
        LivenessResponse.Obj o = res.getObj();

        boolean isLive = o != null && "success".equalsIgnoreCase(o.getLiveness());

        Map<String, Object> out = new HashMap<>();
        out.put("isLive", isLive);
        out.put("liveness", o != null ? o.getLiveness() : null);
        out.put("livenessMsg", o != null ? o.getLivenessMsg() : null);
        out.put("isEyeOpen", o != null ? o.getIsEyeOpen() : null);
        out.put("source", "LIVE");
        return out;
    }

    /**
     * Compare face: nếu match + score >= 95 -> VERIFIED, else -> REJECTED
     */
    public Map<String, Object> compare(UUID sessionId, UUID accountId) {
        EkycSession s = get(sessionId, accountId);

        if (s.getFrontHash() == null || s.getFrontHash().isBlank()) {
            throw new IllegalStateException("Front not uploaded");
        }
        if (s.getSelfieHash() == null || s.getSelfieHash().isBlank()) {
            throw new IllegalStateException("Selfie not uploaded");
        }

        CompareResponse res = vnpt.compare(s.getFrontHash(), s.getSelfieHash(), sessionId.toString());
        CompareResponse.Obj o = res.getObj();

        String msg = (o != null ? o.getMsg() : null);
        Double prob = (o != null && o.getProb() != null) ? o.getProb() : 0.0;

        boolean matched = msg != null && msg.equalsIgnoreCase("MATCH");
        boolean passed = matched && prob >= 95.0;

        s.setStatus(passed ? KycStatus.VERIFIED : KycStatus.REJECTED);
        s.setProviderTrace(toJsonSafe(res));
        sessions.save(s);

        if (passed) {
            User user = userRepository.findById(accountId)
                    .orElseThrow(() -> new IllegalStateException("No account found"));
            user.setIsKycVerified(true);
            userRepository.save(user);
        }

        Map<String, Object> out = new HashMap<>();
        out.put("isMatch", matched);
        out.put("matchScore", prob);
        out.put("status", s.getStatus().name());
        out.put("verifiedAt", passed ? s.getUpdatedAt() : null);
        return out;
    }

    public EkycSession get(UUID sessionId, UUID userId) {
        return sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException(sessionId.toString() + userId.toString()));
    }

    private String getActiveHash(UUID sessionId, UUID accountId, KycDocumentType type) {
        EkycSession s = get(sessionId, accountId);
        if (type == KycDocumentType.FRONT) return s.getFrontHash();
        if (type == KycDocumentType.BACK) return s.getBackHash();
        if (type == KycDocumentType.SELFIE) return s.getSelfieHash();
        return null;
    }

    private String toJsonSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("Cannot serialize VNPT response to JSON. {}", e.getMessage());
            return null;
        }
    }
}

