package com.sba.nutrican_be.auth.dto;

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
