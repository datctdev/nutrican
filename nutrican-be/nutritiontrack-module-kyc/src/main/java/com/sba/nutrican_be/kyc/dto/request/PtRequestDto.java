package com.sba.nutrican_be.kyc.dto.request;

import lombok.Data;

@Data
public class PtRequestDto {
    private String bio;
    private String trainingPhilosophy;
    private Integer yearsOfExperience;
    private String certifications;
    private String cvUrl;
    private String[] specializations;
}
