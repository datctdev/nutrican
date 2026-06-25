package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.DietLogImageDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface DietLogImageService {

    ApiResponse<List<DietLogImageDTO>> uploadImages(UUID dietLogId, MultipartFile[] files, UUID userId);

    ApiResponse<List<DietLogImageDTO>> getImages(UUID dietLogId, UUID userId);

    ApiResponse<DietLogImageDTO> setPrimaryImage(UUID dietLogId, UUID imageId, UUID userId);

    ApiResponse<Void> deleteImage(UUID dietLogId, UUID imageId, UUID userId);

    ApiResponse<Void> deleteAllImages(UUID dietLogId, UUID userId);
}
