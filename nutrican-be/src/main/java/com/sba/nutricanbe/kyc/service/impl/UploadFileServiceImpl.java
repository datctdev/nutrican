package com.sba.nutricanbe.kyc.service.impl;


import com.sba.nutricanbe.kyc.dto.response.UploadResponse;
import com.sba.nutricanbe.kyc.service.UploadFileService;
import com.sba.nutricanbe.kyc.client.VnptClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UploadFileServiceImpl implements UploadFileService {
    private final VnptClient vnpt;

    @Override
    public String upload(MultipartFile file, String title, String description) {
        UploadResponse up = vnpt.addFile(file, title, description);
        String hash = up != null && up.getObject() != null ? up.getObject().getHash() : null;
        if (hash == null || hash.isBlank()) {
            throw new IllegalStateException("VNPT addFile returned empty hash");
        }
        return hash;
    }
}
