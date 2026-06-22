package com.sba.nutrican_be.infrastructure.storage;

import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * MinIO implementation of {@link StorageService}.
 * Handles bucket auto-creation, temp-file upload pattern, presigned URL generation.
 */
@Slf4j
@Service
public class MinioStorageService implements StorageService {

    private final MinioClient minioClient;
    private final String bucketName;

    public MinioStorageService(
            @Value("${minio.url}") String minioUrl,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey,
            @Value("${minio.bucket-name}") String bucketName) {
        this.bucketName = bucketName;
        this.minioClient = MinioClient.builder()
                .endpoint(minioUrl)
                .credentials(accessKey, secretKey)
                .build();
    }

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        String originalFilename = file.getOriginalFilename();
        String extension = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String objectName = folder + "/" + UUID.randomUUID() + extension;

        Path tempFile;
        try {
            tempFile = Files.createTempFile("upload-", extension);
            file.transferTo(tempFile.toFile());
            try {
                boolean found = minioClient.bucketExists(
                        BucketExistsArgs.builder().bucket(bucketName).build());
                if (!found) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                    log.info("Created MinIO bucket: {}", bucketName);
                }
                minioClient.uploadObject(
                        UploadObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .filename(tempFile.toString())
                                .contentType(file.getContentType())
                                .build());
                log.info("Uploaded file: {} to bucket: {}", objectName, bucketName);
            } catch (Exception e) {
                log.error("MinIO upload error for {}: {}", objectName, e.getMessage());
                throw new RuntimeException("Upload failed: " + e.getMessage(), e);
            } finally {
                try { Files.deleteIfExists(tempFile); } catch (Exception ignored) {}
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to create temp file: " + e.getMessage(), e);
        }
        return objectName;
    }

    @Override
    public String getPresignedUrl(String objectName) {
        return getPresignedUrl(objectName, 15);
    }

    @Override
    public String getPresignedUrl(String objectName, int minutes) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectName)
                            .expiry(minutes * 60)
                            .build());
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for: {}", objectName, e);
            return null;
        }
    }

    @Override
    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
            log.debug("Deleted file: {}", objectName);
        } catch (Exception e) {
            log.error("Failed to delete file: {}", objectName, e);
        }
    }
}
