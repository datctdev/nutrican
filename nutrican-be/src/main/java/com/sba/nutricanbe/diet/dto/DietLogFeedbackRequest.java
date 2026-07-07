package com.sba.nutricanbe.diet.dto;

import lombok.Data;

@Data
public class DietLogFeedbackRequest {
    private Integer energyRating;
    private Integer hungerAfterRating;
    private String digestionStatus;
    private String digestionNote;
}
