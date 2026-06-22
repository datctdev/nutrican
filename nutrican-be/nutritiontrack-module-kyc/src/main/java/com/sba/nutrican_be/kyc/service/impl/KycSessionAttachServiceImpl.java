package com.sba.nutrican_be.kyc.service.impl;
import com.sba.nutrican_be.core.entity.EKycDocument;
import com.sba.nutrican_be.core.entity.EKycSession;
import com.sba.nutrican_be.core.enums.KycDocumentType;
import com.sba.nutrican_be.core.enums.KycStatus;
import com.sba.nutrican_be.core.repository.KycDocumentRepository;
import com.sba.nutrican_be.core.repository.KycSessionRepository;
import com.sba.nutrican_be.kyc.service.KycSessionAttachService;
import com.sba.nutrican_be.kyc.valueObjects.AttachDecision;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KycSessionAttachServiceImpl implements KycSessionAttachService {
    private final KycSessionRepository sessions;
    private final KycDocumentRepository docs;

    @Override
    public AttachDecision attachFile(UUID sessionId, UUID userId, String fileHash, String classifyName) {
        EKycSession s = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException(sessionId.toString() +  userId.toString()));

        if (classifyName == null || classifyName.isBlank()) {
            return new AttachDecision(false, "Classify returned empty name", null);
        }
        final String savedTo;

        switch (classifyName.toLowerCase()) {
            case "new_front":
            case "old_front":
            case "old_ver_front":
            case "new_ver_front":
            case "front":
                s.setFrontHash(fileHash);
                sessions.save(s);
                savedTo = "frontHash";
                break;

            case "back":
            case "new_back":
            case "old_back":
            case "old_ver_back":
            case "new_ver_back":
                s.setBackHash(fileHash);
                sessions.save(s);
                savedTo = "backHash";
                break;

            case "other":
            case "other_papers":
            case "other papers":
            case "selfie":
            case "face":
            case "liveness":
                s.setSelfieHash(fileHash);
                sessions.save(s);
                savedTo = "selfieHash";
                break;

            default:
                return new AttachDecision(false, "Uploaded image is not FRONT side, got: " + classifyName, null);
        }

        s.setStatus(KycStatus.IN_PROGRESS);
        sessions.save(s);

        EKycDocument doc = new EKycDocument();
        doc.setSessionId(s.getId());
        doc.setType(determineDocType(classifyName));
        doc.setFileHash(fileHash);
        docs.save(doc);
        return new AttachDecision(true, null, savedTo);
    }

    private KycDocumentType determineDocType(String classifyName) {
        if (classifyName == null) return KycDocumentType.FRONT;
        String lower = classifyName.toLowerCase();
        if (lower.equals("back") || lower.contains("back")) {
            return KycDocumentType.BACK;
        }
        if (lower.equals("selfie") || lower.equals("face") || lower.contains("liveness")) {
            return KycDocumentType.SELFIE;
        }
        return KycDocumentType.FRONT;
    }
}

