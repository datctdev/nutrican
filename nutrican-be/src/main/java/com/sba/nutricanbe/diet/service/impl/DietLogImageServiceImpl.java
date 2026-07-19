package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogImage;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.repository.DietLogImageRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.DietLogImageService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.diet.dto.response.DietLogImageDto;
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
    private final StorageService minioService;

    @Override
    @Transactional
    public ApiResponse<List<DietLogImageDto>> uploadImages(UUID dietLogId, MultipartFile[] files, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only add images to your own diet logs");
        }

        if (files == null || files.length == 0) {
            throw new BadRequestException("No files provided");
        }

        List<DietLogImageDto> uploadedImages = new ArrayList<>();
        List<DietLogImage> existingImages = new ArrayList<>(
                dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId));
        ensureCurrentPrimaryRecord(dietLog, existingImages);
        int nextSortOrder = existingImages.stream()
                .map(DietLogImage::getSortOrder)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(-1) + 1;
        boolean hasPrimaryImage = dietLog.getImageObjectName() != null;

        for (int i = 0; i < files.length; i++) {
            MultipartFile file = files[i];
            String objectName = minioService.uploadFile(file, "diet-logs/" + dietLog.getCustomerId());
            String presignedUrl = minioService.getPresignedUrl(objectName);
            boolean makePrimary = !hasPrimaryImage && i == 0;

            DietLogImage dietLogImage = DietLogImage.builder()
                    .dietLog(dietLog)
                    .imageUrl(presignedUrl)
                    .imageObjectName(objectName)
                    .isPrimary(makePrimary)
                    .sortOrder(nextSortOrder + i)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();

            dietLogImage = dietLogImageRepository.save(dietLogImage);
            if (makePrimary) {
                dietLog.setImageUrl(presignedUrl);
                dietLog.setImageObjectName(objectName);
                dietLogRepository.save(dietLog);
            }
            uploadedImages.add(toDTO(dietLogImage));
            log.info("Image uploaded for diet log {}: {}", dietLogId, objectName);
        }

        return ApiResponse.success(uploadedImages, "Images uploaded successfully");
    }

    @Override
    @Transactional
    public ApiResponse<List<DietLogImageDto>> getImages(UUID dietLogId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only view images of your own diet logs");
        }

        List<DietLogImage> images = new ArrayList<>(
                dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId));
        ensureCurrentPrimaryRecord(dietLog, images);
        return ApiResponse.success(images.stream().map(this::toDTO).toList());
    }

    @Override
    @Transactional
    public ApiResponse<DietLogImageDto> setPrimaryImage(UUID dietLogId, UUID imageId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only modify your own diet logs");
        }

        DietLogImage targetImage = dietLogImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLogImage", imageId));

        if (!targetImage.getDietLog().getId().equals(dietLogId)) {
            throw new BadRequestException("Image does not belong to this diet log");
        }

        List<DietLogImage> allImages = new ArrayList<>(
                dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId));
        ensureCurrentPrimaryRecord(dietLog, allImages);
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

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only delete images from your own diet logs");
        }

        DietLogImage image = dietLogImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLogImage", imageId));

        if (!image.getDietLog().getId().equals(dietLogId)) {
            throw new BadRequestException("Image does not belong to this diet log");
        }

        List<DietLogImage> allImages = new ArrayList<>(
                dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId));
        deleteImageRecord(dietLog, image, allImages);

        log.info("Image deleted from diet log {}: {}", dietLogId, imageId);
        return ApiResponse.success(null, "Image deleted");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deletePrimaryImage(UUID dietLogId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only delete images from your own diet logs");
        }

        if (dietLog.getImageObjectName() == null) {
            return ApiResponse.success(null, "Primary image already empty");
        }

        List<DietLogImage> allImages = new ArrayList<>(
                dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId));
        DietLogImage storedPrimary = allImages.stream()
                .filter(image -> sameObject(image.getImageObjectName(), dietLog.getImageObjectName()))
                .findFirst()
                .orElse(null);

        if (storedPrimary != null) {
            deleteImageRecord(dietLog, storedPrimary, allImages);
        } else {
            minioService.deleteFile(dietLog.getImageObjectName());
            applyPrimaryImage(dietLog, allImages, allImages.isEmpty() ? null : allImages.get(0));
            dietLogImageRepository.saveAll(allImages);
            dietLogRepository.save(dietLog);
        }

        log.info("Primary image deleted from diet log {}", dietLogId);
        return ApiResponse.success(null, "Primary image deleted");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteAllImages(UUID dietLogId, UUID userId) {
        DietLog dietLog = dietLogRepository.findById(dietLogId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", dietLogId));

        if (!dietLog.getCustomerId().equals(userId)) {
            throw new BadRequestException("You can only delete images from your own diet logs");
        }

        List<DietLogImage> images = dietLogImageRepository.findByDietLogIdOrderBySortOrderAsc(dietLogId);
        java.util.Set<String> objectNames = new java.util.LinkedHashSet<>();
        if (dietLog.getImageObjectName() != null) {
            objectNames.add(dietLog.getImageObjectName());
        }
        images.stream().map(DietLogImage::getImageObjectName).forEach(objectNames::add);
        objectNames.forEach(minioService::deleteFile);
        dietLogImageRepository.deleteAll(images);
        dietLog.setImageUrl(null);
        dietLog.setImageObjectName(null);
        dietLogRepository.save(dietLog);

        log.info("All images deleted from diet log {}", dietLogId);
        return ApiResponse.success(null, "All images deleted");
    }

    private DietLogImage ensureCurrentPrimaryRecord(DietLog dietLog, List<DietLogImage> images) {
        if (dietLog.getImageObjectName() == null) return null;

        DietLogImage current = images.stream()
                .filter(image -> sameObject(image.getImageObjectName(), dietLog.getImageObjectName()))
                .findFirst()
                .orElse(null);

        if (current == null) {
            current = dietLogImageRepository.save(DietLogImage.builder()
                    .dietLog(dietLog)
                    .imageUrl(dietLog.getImageUrl())
                    .imageObjectName(dietLog.getImageObjectName())
                    .isPrimary(true)
                    .sortOrder(-1)
                    .build());
            images.add(0, current);
        }

        for (DietLogImage image : images) {
            image.setIsPrimary(image.getId().equals(current.getId()));
        }
        dietLogImageRepository.saveAll(images);
        return current;
    }

    private void deleteImageRecord(DietLog dietLog, DietLogImage image, List<DietLogImage> allImages) {
        boolean deletingPrimary = sameObject(image.getImageObjectName(), dietLog.getImageObjectName())
                || Boolean.TRUE.equals(image.getIsPrimary());
        List<DietLogImage> remainingImages = allImages.stream()
                .filter(candidate -> !candidate.getId().equals(image.getId()))
                .toList();

        minioService.deleteFile(image.getImageObjectName());
        dietLogImageRepository.delete(image);

        if (deletingPrimary) {
            DietLogImage replacement = remainingImages.isEmpty() ? null : remainingImages.get(0);
            applyPrimaryImage(dietLog, remainingImages, replacement);
            dietLogImageRepository.saveAll(remainingImages);
            dietLogRepository.save(dietLog);
        }
    }

    private void applyPrimaryImage(DietLog dietLog, List<DietLogImage> images, DietLogImage primaryImage) {
        for (DietLogImage image : images) {
            image.setIsPrimary(primaryImage != null && image.getId().equals(primaryImage.getId()));
        }
        dietLog.setImageUrl(primaryImage != null ? primaryImage.getImageUrl() : null);
        dietLog.setImageObjectName(primaryImage != null ? primaryImage.getImageObjectName() : null);
    }

    private boolean sameObject(String left, String right) {
        return left != null && left.equals(right);
    }

    private DietLogImageDto toDTO(DietLogImage image) {
        return DietLogImageDto.builder()
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
