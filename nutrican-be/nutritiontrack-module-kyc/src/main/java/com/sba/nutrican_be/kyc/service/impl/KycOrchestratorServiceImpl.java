package com.sba.nutrican_be.kyc.service.impl;

import com.sba.nutrican_be.kyc.service.*;
import com.sba.nutrican_be.kyc.service.KycOrchestratorService;
import com.sba.nutrican_be.kyc.valueObjects.AttachDecision;
import com.sba.nutrican_be.kyc.valueObjects.CardLivenessResult;
import com.sba.nutrican_be.kyc.valueObjects.ClassifyResult;
import com.sba.nutrican_be.kyc.valueObjects.FaceLivenessResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KycOrchestratorServiceImpl implements KycOrchestratorService {

    private final UploadFileService uploadService;
    private final CardLivenessService cardLivenessService;
    private final CardClassifyService classifyService;
    private final KycSessionAttachService attachService;
    private final FaceLivenessService faceLivenessService;

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static Object nzObj(Object v, Object def) {
        return v == null ? def : v;
    }

    private static final Map<String, Integer> TITLE_TO_TYPE = Map.of(
            "FRONT", 0,
            "BACK", 1,
            "SIDE", 2,
            "FACE", 3,
            "SELFIE", 4
    );

    public Map<String, Object> uploadFileAndAttach(
            UUID sessionId,
            UUID userId,
            MultipartFile file,
            String title,
            String description
    ) {
        // 1) upload -> hash VNPT
        String hash = uploadService.upload(file, title, description);
        if (hash == null || hash.isBlank()) {
            return Map.of(
                    "ok", false,
                    "step", "UPLOAD",
                    "fileHash", "",
                    "reason", "Empty hash from upload"
            );
        }

        // 2) classify FIRST (để route) - dùng làm fallback
        ClassifyResult cls = classifyService.classify(hash, sessionId.toString());
        if (cls == null || cls.name() == null || cls.name().isBlank()) {
            return Map.of(
                    "ok", false,
                    "step", "CLASSIFY",
                    "fileHash", hash,
                    "reason", "Classify returned empty name"
            );
        }

        // 3) Ưu tiên title từ client cho type, chỉ dùng classify khi title không hợp lệ
        Integer type;
        String name;
        boolean hasValidTitle = title != null && !title.isBlank() && TITLE_TO_TYPE.containsKey(title.toUpperCase().trim());
        
        if (hasValidTitle) {
            // Dùng hoàn toàn title từ client
            type = TITLE_TO_TYPE.get(title.toUpperCase().trim());
            name = title.toUpperCase().trim();
        } else {
            // Fallback sang VNPT classify
            type = cls.type();
            name = cls.name();
        }

        if (type != null && (type == 0 || type == 1 || type == 2 || type == 3)) {
            // 3a) card/document liveness
            CardLivenessResult live = cardLivenessService.verify(hash, sessionId.toString());
            if (live == null || !live.isReal()) {
                return Map.of(
                        "ok", false,
                        "step", "CARD_LIVENESS",
                        "fileHash", hash,
                        "classifiedName", nz(name),
                        "classifiedType", nzObj(type, -1),
                        "liveness", live != null ? nz(live.liveness()) : "",
                        "livenessMsg", live != null ? nz(live.livenessMsg()) : ""
                );
            }
        } else if (type != null && type == 4) {
            // 3b) face/selfie - skip liveness check (optional via config)
            // FaceLivenessResult faceLive = faceLivenessService.verify(hash, sessionId.toString());
            // if (faceLive == null || !faceLive.isLive()) {
            //     return Map.of(
            //             "ok", false,
            //             "step", "FACE_LIVENESS",
            //             "fileHash", hash,
            //             "classifiedName", nz(name),
            //             "classifiedType", nzObj(type, -1),
            //             "liveness", faceLive != null ? nz(faceLive.liveness()) : "",
            //             "livenessMsg", faceLive != null ? nz(faceLive.livenessMsg()) : ""
            //     );
            // }
        } else {
            return Map.of(
                    "ok", false,
                    "step", "ROUTE_UNSUPPORTED",
                    "fileHash", hash,
                    "classifiedName", nz(name),
                    "classifiedType", nzObj(type, -1),
                    "reason", "Unsupported classify type for this endpoint"
            );
        }

        // 4) Xác định tên file gắn vào session
        String attachName = nz(name);
        if (title != null && !title.isBlank()) {
            attachName = title.toUpperCase().trim();
        }

        AttachDecision decision = attachService.attachFile(sessionId, userId, hash, attachName);
        if (decision == null || !decision.attached()) {
            return Map.of(
                    "ok", false,
                    "step", "ATTACH",
                    "fileHash", hash,
                    "classifiedName", nz(name),
                    "classifiedType", nzObj(type, -1),
                    "reason", decision != null ? nz(decision.reason()) : "ATTACH_DECISION_NULL"
            );
        }

        return Map.of(
                "ok", true,
                "fileHash", hash,
                "classifiedName", nz(name),
                "classifiedType", nzObj(type, -1),
                "classifiedConfidence", nzObj(cls.confidence(), 0.0),
                "savedTo", nz(decision.savedTo())
        );
    }
}
