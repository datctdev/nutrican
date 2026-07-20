package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.TrainingMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class UpdatePtProfileRequest {
    @Size(max = 2000)
    private String bio;

    @Size(max = 2000)
    private String trainingPhilosophy;

    private String location;

    private TrainingMode trainingMode;

    private String contactPhone;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal onlineRate;

    @Size(max = 20)
    private String onlineRateUnit;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal offlineRate;

    @Size(max = 20)
    private String offlineRateUnit;

    private List<String> specializations;

    private String instagramUrl;

    private String linkedinUrl;

    private Map<String, Object> portfolioShowcase;
}
