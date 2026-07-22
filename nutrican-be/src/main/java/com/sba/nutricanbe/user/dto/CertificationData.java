package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificationData {
    private String name;
    private String issuingOrganization;
    private String issueDate;
    private String expiryDate;
    private Boolean neverExpires;
    private String certificateImageUrl;
}
