package com.sba.nutricanbe.kyc.usecase.impl;


import com.sba.nutricanbe.kyc.config.EKycConfig;
import com.sba.nutricanbe.kyc.dto.response.*;
import com.sba.nutricanbe.kyc.dto.request.*;
import com.sba.nutricanbe.kyc.usecase.VNPTClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;


import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class VNPTClientImpl implements VNPTClient {

    private final RestClient vnptRestClient;
    private final EKycConfig cfg;

    @Override
    public UploadResponse addFile(MultipartFile file, String title, String description) {
        try {
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("file is empty");
            }

            var form = new LinkedMultiValueMap<String, Object>();

            // IMPORTANT: multipart part must have filename
            ByteArrayResource filePart = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
                }
            };

            form.add("file", filePart);
            if (title != null && !title.isBlank()) form.add("title", title);
            // description is required by VNPT - use title or default value
            String desc = (description != null && !description.isBlank()) ? description : "kyc-upload";
            form.add("description", desc);

            UploadResponse res = vnptRestClient.post()
                    .uri("/file-service/v1/addFile")
                    .header("Authorization", "Bearer " + cfg.getAccessToken())
                    .header("Token-id", cfg.getTokenId())
                    .header("Token-key", cfg.getTokenKey())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(UploadResponse.class);

            return Objects.requireNonNull(res, "VNPT addFile returned null");
        } catch (Exception e) {
            throw new RuntimeException("VNPT addFile failed: " + e.getMessage(), e);
        }
    }

    @Override
    public CardLivenessResponse cardLiveness(String imgHash, String session) {
        CardLivenessRequest req = new CardLivenessRequest();
        req.setImg(imgHash);
        req.setClientSession(session);

        CardLivenessResponse res = vnptRestClient.post()
                .uri("/ai/v1/card/liveness")
                .header("Authorization", "Bearer " + cfg.getAccessToken())
                .header("Token-id", cfg.getTokenId())
                .header("Token-key", cfg.getTokenKey())
                .body(req)
                .retrieve()
                .body(CardLivenessResponse.class);

        return Objects.requireNonNull(res, "VNPT cardLiveness returned null");
    }


    // Lombok @RequiredArgsConstructor không cho custom init WebClient field dễ đọc,
    // nên dùng constructor explicit để build WebClient đúng baseUrl + headers.
    @Override
    public ClassifyResponse classify(String imgHash, String session) {
        ClassifyRequest req = new ClassifyRequest();
        req.setImgCard(imgHash);
        req.setClientSession(session);
        req.setToken(cfg.getTokenKey());

        ClassifyResponse res = vnptRestClient.post()
                .uri("/ai/v1/classify/id")
                .header("Authorization", "Bearer " + cfg.getAccessToken())
                .header("Token-id", cfg.getTokenId())
                .header("Token-key", cfg.getTokenKey())
                .body(req)
                .retrieve()
                .body(ClassifyResponse.class);

        return Objects.requireNonNull(res, "VNPT classify returned null");
    }

    @Override
    public OcrFrontResponse ocrFront(String imgHash, int type, String session) {
        try {
            OcrFrontRequest req = new OcrFrontRequest();
            req.setImgFront(imgHash);
            req.setType(type);
            req.setClientSession(session);
            req.setToken(cfg.getTokenKey());

            OcrFrontResponse res = vnptRestClient.post()
                    .uri("/ai/v1/ocr/id/front")
                    .header("Authorization", "Bearer " + cfg.getAccessToken())
                    .header("Token-id", cfg.getTokenId())
                    .header("Token-key", cfg.getTokenKey())
                    .body(req)
                    .retrieve()
                    .body(OcrFrontResponse.class);

            return Objects.requireNonNull(res, "VNPT ocrFront returned null");

        } catch (ResourceAccessException e) {
            Throwable root = e.getMostSpecificCause(); // rất quan trọng
            log.error("[VNPT] ResourceAccessException rootCause={}", root, e);
            throw e;
        } catch (RestClientException e) {
            log.error("[VNPT] RestClientException", e);
            throw e;
        }
    }

    @Override
    public OcrBackResponse ocrBack(String imgHash, int type, String session) {
        OcrBackRequest req = new OcrBackRequest();
        req.setImgBack(imgHash);
        req.setType(type);
        req.setClientSession(session);
        req.setToken(cfg.getTokenKey());

        OcrBackResponse res = vnptRestClient.post()
                .uri("/ai/v1/ocr/id/back")
                .header("Authorization", "Bearer " + cfg.getAccessToken())
                .header("Token-id", cfg.getTokenId())
                .header("Token-key", cfg.getTokenKey())
                .body(req)
                .retrieve()
                .body(OcrBackResponse.class);

        return Objects.requireNonNull(res, "VNPT ocrBack returned null");
    }

    @Override
    public LivenessResponse liveness(String imgHash, String session) {
        LivenessRequest req = new LivenessRequest();
        req.setImg(imgHash);
        req.setClientSession(session);
        req.setToken(cfg.getTokenKey());

        LivenessResponse res = vnptRestClient.post()
                .uri("/ai/v1/face/liveness")
                .header("Authorization", "Bearer " + cfg.getAccessToken())
                .header("Token-id", cfg.getTokenId())
                .header("Token-key", cfg.getTokenKey())
                .body(req)
                .retrieve()
                .body(LivenessResponse.class);

        return Objects.requireNonNull(res, "VNPT liveness returned null");
    }

    @Override
    public CompareResponse compare(String frontHash, String faceHash, String session) {
        CompareRequest req = new CompareRequest();
        req.setImgFront(frontHash);
        req.setImgFace(faceHash);
        req.setClientSession(session);
        req.setToken(cfg.getTokenKey());

        CompareResponse res = vnptRestClient.post()
                .uri("/ai/v1/face/compare")
                .header("Authorization", "Bearer " + cfg.getAccessToken())
                .header("Token-id", cfg.getTokenId())
                .header("Token-key", cfg.getTokenKey())
                .body(req)
                .retrieve()
                .body(CompareResponse.class);

        return Objects.requireNonNull(res, "VNPT compare returned null");
    }

}
