package com.sba.nutrican_be.ai.service;

import com.sba.nutrican_be.ai.dto.LlavaMealAnalysisResult;
import org.springframework.web.multipart.MultipartFile;

public interface LlavaMealAnalysisService {

    LlavaMealAnalysisResult analyzeMealImage(MultipartFile file, String resnetHint, String resnetFoodCode);

    boolean isAvailable();
}
