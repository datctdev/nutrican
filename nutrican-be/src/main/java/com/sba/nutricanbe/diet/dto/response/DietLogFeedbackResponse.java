package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DietLogFeedbackResponse {
    private UUID id;
    private UUID dietLogId;
    private Integer energyRating;
    private Integer hungerAfterRating;
    private String digestionStatus;
    private String digestionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DietLogFeedbackResponse from(DietLogFeedback f) {
        if (f == null) {
            return null;
        }
        return DietLogFeedbackResponse.builder()
                .id(f.getId())
                .dietLogId(f.getDietLogId())
                .energyRating(f.getEnergyRating())
                .hungerAfterRating(f.getHungerAfterRating())
                .digestionStatus(f.getDigestionStatus())
                .digestionNote(f.getDigestionNote())
                .createdAt(f.getCreatedAt())
                .updatedAt(f.getUpdatedAt())
                .build();
    }
}
