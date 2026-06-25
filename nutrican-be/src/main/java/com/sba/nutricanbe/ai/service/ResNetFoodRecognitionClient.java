package com.sba.nutricanbe.ai.service;

import com.sba.nutricanbe.ai.dto.ResNetAnalyzeResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ResNetFoodRecognitionClient {

    ResNetAnalyzeResponse analyze(MultipartFile file);

    boolean isHealthy();
}
