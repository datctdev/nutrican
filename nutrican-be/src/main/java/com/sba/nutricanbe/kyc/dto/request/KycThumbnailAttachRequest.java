package com.sba.nutricanbe.kyc.dto.request;

import com.sba.nutricanbe.common.enums.KycDocumentType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.jetbrains.annotations.NotNull;

@Data
public class KycThumbnailAttachRequest {
    @NotNull
    private KycDocumentType type;

    @NotBlank
    private String fileHash;
}

