package com.sba.nutricanbe.infrastructure.storage;

import org.springframework.web.multipart.MultipartFile;


public interface StorageService {


    String uploadFile(MultipartFile file, String folder);


    String getPresignedUrl(String objectName);


    String getPresignedUrl(String objectName, int minutes);


    void deleteFile(String objectName);
}
