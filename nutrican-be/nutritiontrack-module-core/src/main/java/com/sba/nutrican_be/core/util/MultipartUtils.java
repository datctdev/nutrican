package com.sba.nutrican_be.core.util;

import com.sba.nutrican_be.core.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

public final class MultipartUtils {

    private MultipartUtils() {
    }

    public static MultipartFile requireSingleFile(
            MultipartFile file,
            MultipartFile image,
            MultipartFile[] files) {
        List<MultipartFile> collected = new ArrayList<>();
        addIfPresent(collected, file);
        addIfPresent(collected, image);
        if (files != null) {
            for (MultipartFile part : files) {
                addIfPresent(collected, part);
            }
        }
        if (collected.isEmpty()) {
            throw new BadRequestException(
                    "Image file is required. Send multipart/form-data with field 'file', 'image', or 'files'.");
        }
        if (collected.size() > 1) {
            throw new BadRequestException("Only one image is allowed per AI analysis");
        }
        return collected.get(0);
    }

    private static void addIfPresent(List<MultipartFile> target, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return;
        }
        boolean duplicate = target.stream().anyMatch(existing ->
                existing.getOriginalFilename() != null
                        && existing.getOriginalFilename().equals(file.getOriginalFilename())
                        && existing.getSize() == file.getSize());
        if (!duplicate) {
            target.add(file);
        }
    }
}
