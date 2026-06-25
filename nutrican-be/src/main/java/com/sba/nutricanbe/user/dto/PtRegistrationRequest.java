package com.sba.nutricanbe.user.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtRegistrationRequest {

    @NotBlank(message = "Bio is required")
    private String bio;

    @NotBlank(message = "Training philosophy is required")
    private String trainingPhilosophy;

    @Min(value = 0, message = "Years of experience must be non-negative")
    private Integer yearsOfExperience;

    private List<String> specializations;

    private String certifications;

    private BigDecimal hourlyRate;

    private String cvUrl;
}
