package com.sba.nutricanbe.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationRequest {

    @NotBlank(message = "Tên chứng chỉ là bắt buộc")
    private String name;

    @NotBlank(message = "Tổ chức cấp là bắt buộc")
    private String issuingOrganization;

    @NotBlank(message = "Ngày cấp là bắt buộc")
    private String issueDate;

    private String expiryDate;

    private Boolean neverExpires;

    @NotBlank(message = "Ảnh chứng chỉ là bắt buộc")
    private String certificateImageUrl;
}
