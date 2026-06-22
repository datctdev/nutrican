package com.sba.nutrican_be.kyc.controller;


import com.sba.nutrican_be.core.config.CurrentUser;
import com.sba.nutrican_be.core.config.CurrentUserInfo;
import com.sba.nutrican_be.kyc.dto.request.KycThumbnailAttachRequest;
import com.sba.nutrican_be.core.entity.EKycSession;
import com.sba.nutrican_be.kyc.service.CompareKycService;
import com.sba.nutrican_be.kyc.service.KycOrchestratorService;
import com.sba.nutrican_be.core.enums.KycDocumentType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(path = "/api/v1/kyc")
@RequiredArgsConstructor
public class KycController {
    private final KycOrchestratorService orchestratorService;
    private final CompareKycService compareKycService;


    @PostMapping("/sessions:start")
    public ResponseEntity<Map<String, Object>> start(@CurrentUser CurrentUserInfo u) {
        UUID sessionId = orchestratorService.start(u.getUserId());
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "status", "DRAFT"
        ));
    }


    @PostMapping("/session/{id}/upload")
    public Map<String, Object> upload(
            @PathVariable("id") UUID sessionId,
            @RequestParam("type") KycDocumentType type,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @CurrentUser CurrentUserInfo u
    ) {
        String vnptHash = orchestratorService.uploadToVnptAndAttach(
                sessionId,
                u.getUserId(),
                type,
                file,
                title,
                description
        );

        return Map.of(
                "fileHash", vnptHash,
                "type", type.name(),
                "sessionId", sessionId.toString()
        );
    }

    @PostMapping(
            "/session/{id}/attach"
    )
    public Map<String, Object> attach(
            @PathVariable("id") UUID sessionId,
            @RequestBody @Valid KycThumbnailAttachRequest req,
            @CurrentUser CurrentUserInfo u
    ) {
        orchestratorService.attachFile(sessionId, u.getUserId(), req.getType(), req.getFileHash());
        var session = orchestratorService.get(sessionId, u.getUserId());

        return Map.of(
                "success", true,
                "session", session
        );
    }

    @PostMapping("/sessions/{sessionId}/classify")
    public ResponseEntity<Map<String, Object>> classify(
            @PathVariable UUID sessionId,
            @CurrentUser CurrentUserInfo u,
            @RequestParam(required = false) String fileHash

    ) {
        Map<String, Object> out = orchestratorService.classify(sessionId, u.getUserId(), fileHash);
        return ResponseEntity.ok(out);
    }

    @PostMapping("/sessions/{sessionId}/ocr/front")
    public ResponseEntity<Map<String, Object>> ocrFront(
            @PathVariable UUID sessionId,
            @CurrentUser CurrentUserInfo u,
            @RequestParam(required = false) String fileHash,
            @RequestParam(name = "type", defaultValue = "-1") int type
    ) {
        Map<String, Object> out = orchestratorService.ocrFront(sessionId, u.getUserId(), fileHash, type);
        return ResponseEntity.ok(out);
    }

    @PostMapping("/sessions/{sessionId}/ocr/back")
    public ResponseEntity<Map<String, Object>> ocrBack(
            @PathVariable UUID sessionId,
            @CurrentUser CurrentUserInfo u,
            @RequestParam(required = false) String fileHash,
            @RequestParam(name = "type", defaultValue = "-1") int type
    ) {
        Map<String, Object> out = orchestratorService.ocrBack(sessionId, u.getUserId(), fileHash, type);
        return ResponseEntity.ok(out);
    }

    @PostMapping("/sessions/{sessionId}/ocr/liveness")
    public ResponseEntity<Map<String, Object>> liveness(
            @PathVariable UUID sessionId,
            @CurrentUser CurrentUserInfo u,
            @RequestParam(required = false) String fileHash
    ) {
        Map<String, Object> out = orchestratorService.liveness(sessionId, u.getUserId(), fileHash);
        return ResponseEntity.ok(out);
    }

    @PostMapping("/sessions/{sessionId}/compare")
    public ResponseEntity<Map<String, Object>> compare(
            @PathVariable UUID sessionId,
            @CurrentUser CurrentUserInfo u
    ) {
        Map<String, Object> out = compareKycService.compare(sessionId, u.getUserId());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> get(
            @PathVariable UUID sessionId,
            @CurrentUser CurrentUserInfo u
    ) {
        EKycSession session = orchestratorService.get(sessionId, u.getUserId());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "session", session
        ));
    }

    @PostMapping(
            value = "/sessions/{sessionId}/fullFlow-upload"
    )
    public ResponseEntity<Map<String, Object>> uploadAndCheckImages(
            @PathVariable UUID sessionId,
            @RequestPart("file") @NotNull MultipartFile file,
            @RequestPart(value = "title", required = false) String title,
            @RequestPart(value = "description", required = false) String description,
            @CurrentUser CurrentUserInfo u
    ) {
        Map<String, Object> out = orchestratorService.uploadFileAndAttach(
                sessionId,
                u.getUserId(),
                file,
                title,
                description
        );
        return ResponseEntity.ok(out);
    }

}
