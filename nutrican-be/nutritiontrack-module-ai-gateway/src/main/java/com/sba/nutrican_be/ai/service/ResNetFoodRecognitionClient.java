package com.sba.nutrican_be.ai.service;

import com.sba.nutrican_be.ai.dto.ResNetAnalyzeResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ResNetFoodRecognitionClient {

    ResNetAnalyzeResponse analyze(MultipartFile file);

    boolean isHealthy();
}
