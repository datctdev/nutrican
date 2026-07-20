package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.TrainingMode;
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
    
    private BigDecimal hourlyRate;
    
    private List<String> specializations;
    
    private String instagramUrl;
    
    private String linkedinUrl;
    
    private Map<String, Object> portfolioShowcase;
}
