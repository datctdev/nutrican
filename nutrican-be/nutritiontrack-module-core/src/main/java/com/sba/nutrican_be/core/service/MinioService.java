package com.sba.nutrican_be.core.service;

import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Slf4j
@Service
public class MinioService {

    private final MinioClient minioClient;
    private final String bucketName;

    public MinioService(
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

    public String uploadFile(MultipartFile file, String folder) {
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String objectName = folder + "/" + UUID.randomUUID() + extension;

        Path tempFile;
        try {
            tempFile = Files.createTempFile("upload-", extension);
            file.transferTo(tempFile.toFile());

            try {
                boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
                if (!found) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                }
                minioClient.uploadObject(
                        UploadObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .filename(tempFile.toString())
                                .contentType(file.getContentType())
                                .build());
                log.info("Uploaded file: {} to bucket: {}", objectName, bucketName);
            } catch (io.minio.errors.ErrorResponseException e) {
                log.error("MinIO error during upload: {}", e.getMessage());
                throw new RuntimeException("Upload failed: " + e.getMessage(), e);
            } catch (Exception e) {
                log.error("MinIO error during upload: {}", e.getMessage());
                throw new RuntimeException("Upload failed: " + e.getMessage(), e);
            } finally {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (java.io.IOException e) {
                    log.warn("Failed to delete temp file: {}", e.getMessage());
                }
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to create temp file: " + e.getMessage(), e);
        }
        return objectName;
    }

    public String getPresignedUrl(String objectName) {
        return getPresignedUrl(objectName, 15);
    }

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

    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
        } catch (Exception e) {
            log.error("Failed to delete file: {}", objectName, e);
        }
    }
}
