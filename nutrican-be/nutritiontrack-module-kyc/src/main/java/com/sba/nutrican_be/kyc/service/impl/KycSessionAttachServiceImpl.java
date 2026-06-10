package com.sba.nutrican_be.kyc.service.impl;
import com.sba.nutrican_be.kyc.entity.EKycDocument;
import com.sba.nutrican_be.kyc.entity.EKycSession;
import com.sba.nutrican_be.kyc.repository.KycDocumentRepository;
import com.sba.nutrican_be.kyc.repository.KycSessionRepository;
import com.sba.nutrican_be.kyc.service.KycSessionAttachService;
import com.sba.nutrican_be.kyc.valueObjects.AttachDecision;
import com.sba.nutrican_be.kyc.valueObjects.KycDocumentType;
import com.sba.nutrican_be.kyc.valueObjects.KycStatus;
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
                s.setFrontHash(fileHash);
                sessions.save(s);
                savedTo = "frontHash";
                break;

            case "other":
            case "other_papers":
            case "other papers":
                s.setSelfieHash(fileHash);
                sessions.save(s);
                savedTo = "selfieHash";
                break;

            default:
                return new AttachDecision(false, "Uploaded image is not FRONT side", null);
        }

        s.setStatus(KycStatus.IN_PROGRESS);
        sessions.save(s);

        EKycDocument doc = new EKycDocument();
        doc.setSessionId(s.getId());
        doc.setType(KycDocumentType.FRONT);
        doc.setFileHash(fileHash);
        docs.save(doc);
        return new AttachDecision(true, null, savedTo);
    }
}
