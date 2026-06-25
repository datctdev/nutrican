package com.sba.nutricanbe.ai.service;

import com.sba.nutricanbe.ai.dto.LlavaMealAnalysisResult;
import org.springframework.web.multipart.MultipartFile;

public interface LlavaMealAnalysisService {

    LlavaMealAnalysisResult analyzeMealImage(MultipartFile file, String resnetHint, String resnetFoodCode);

    boolean isAvailable();
}
