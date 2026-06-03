package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.entity.DietLogImage;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.DietLogImageRepository;
import com.sba.nutrican_be.core.repository.DietLogRepository;
import com.sba.nutrican_be.core.service.MinioService;
import com.sba.nutrican_be.diet.dto.DietLogImageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DietLogImageServiceImpl implements DietLogImageService {

    private final DietLogRepository dietLogRepository;
    private final DietLogImageRepository dietLogImageRepository;
    private final MinioService minioService;

    @Override
    @Transactional
    public ApiResponse<List<DietLogImageDTO>> uploadImages(UUID dietLogId, MultipartFile[] files, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
            throw new BadRequestException("You can only add images to your own diet logs");
        }

        if (files == null || files.length == 0) {
            throw new BadRequestException("No files provided");
        }

        List<DietLogImageDTO> uploadedImages = new ArrayList<>();
        int existingCount = dietLogImageRepository.countByDietLogId(dietLogId);

        for (int i = 0; i < files.length; i++) {
            MultipartFile file = files[i];
            String objectName = minioService.uploadFile(file, "diet-logs/" + dietLog.getCustomer().getId());
            String presignedUrl = minioService.getPresignedUrl(objectName);

            DietLogImage dietLogImage = DietLogImage.builder()
                    .dietLog(dietLog)
                    .imageUrl(presignedUrl)
                    .imageObjectName(objectName)
                    .isPrimary(false)
                    .sortOrder(existingCount + i)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();

            dietLogImage = dietLogImageRepository.save(dietLogImage);
            uploadedImages.add(toDTO(dietLogImage));
            log.info("Additional image uploaded for diet log {}: {}", dietLogId, objectName);
        }

        return ApiResponse.success(uploadedImages, "Images uploaded successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<DietLogImageDTO>> getImages(UUID dietLogId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
            throw new BadRequestException("You can only view images of your own diet logs");
        }

        List<DietLogImage> images = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId);
        return ApiResponse.success(images.stream().map(this::toDTO).toList());
    }

    @Override
    @Transactional
    public ApiResponse<DietLogImageDTO> setPrimaryImage(UUID dietLogId, UUID imageId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
            throw new BadRequestException("You can only modify your own diet logs");
        }

        DietLogImage targetImage = dietLogImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLogImage", imageId));

        if (!targetImage.getDietLog().getId().equals(dietLogId)) {
            throw new BadRequestException("Image does not belong to this diet log");
        }

        List<DietLogImage> allImages = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId);
        for (DietLogImage img : allImages) {
            img.setIsPrimary(img.getId().equals(imageId));
        }
        dietLogImageRepository.saveAll(allImages);

        dietLog.setImageUrl(targetImage.getImageUrl());
        dietLog.setImageObjectName(targetImage.getImageObjectName());
        dietLogRepository.save(dietLog);

        log.info("Primary image set for diet log {}: {}", dietLogId, imageId);
        return ApiResponse.success(toDTO(targetImage), "Primary image updated");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteImage(UUID dietLogId, UUID imageId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
            throw new BadRequestException("You can only delete images from your own diet logs");
        }

        DietLogImage image = dietLogImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLogImage", imageId));

        if (!image.getDietLog().getId().equals(dietLogId)) {
            throw new BadRequestException("Image does not belong to this diet log");
        }

        minioService.deleteFile(image.getImageObjectName());
        dietLogImageRepository.delete(image);

        log.info("Image deleted from diet log {}: {}", dietLogId, imageId);
        return ApiResponse.success(null, "Image deleted");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteAllImages(UUID dietLogId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomer().getId().equals(userId)) {
            throw new BadRequestException("You can only delete images from your own diet logs");
        }

        List<DietLogImage> images = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId);
        for (DietLogImage image : images) {
            minioService.deleteFile(image.getImageObjectName());
        }
        dietLogImageRepository.deleteAll(images);

        log.info("All images deleted from diet log {}", dietLogId);
        return ApiResponse.success(null, "All images deleted");
    }

    private DietLogImageDTO toDTO(DietLogImage image) {
        return DietLogImageDTO.builder()
                .id(image.getId())
                .dietLogId(image.getDietLog().getId())
                .imageUrl(image.getImageUrl())
                .imageObjectName(image.getImageObjectName())
                .isPrimary(image.getIsPrimary())
                .sortOrder(image.getSortOrder())
                .fileSize(image.getFileSize())
                .contentType(image.getContentType())
                .aiConfidenceScore(image.getAiConfidenceScore())
                .macrosJson(image.getMacrosJson())
                .build();
    }
}
