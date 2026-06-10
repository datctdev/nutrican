package com.sba.nutrican_be.kyc.service;

import org.springframework.web.multipart.MultipartFile;

public interface UploadFileService {
    String upload(MultipartFile file, String title, String description);
}
