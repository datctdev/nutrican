package com.sba.nutrican_be.infrastructure.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Storage service abstraction — decouples business logic from specific object store implementation.
 * Current implementation: MinIO. Can be swapped to S3, GCS, etc. without touching callers.
 */
public interface StorageService {

    /**
     * Upload a file and return the object name (path) stored in the bucket.
     *
     * @param file   multipart file to upload
     * @param folder logical folder prefix (e.g. "diet-logs/userId", "avatars")
     * @return object name that can be used to generate presigned URLs or delete the file
     */
    String uploadFile(MultipartFile file, String folder);

    /**
     * Generate a presigned GET URL valid for 15 minutes.
     */
    String getPresignedUrl(String objectName);

    /**
     * Generate a presigned GET URL valid for the specified number of minutes.
     */
    String getPresignedUrl(String objectName, int minutes);

    /**
     * Permanently delete a stored object.
     */
    void deleteFile(String objectName);
}
