package com.sba.nutricanbe.diet.dto.request;

import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.SosReasonCode;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateSosRequest {
    private UUID dietLogId;
    private String note;
    private String priority;
    private SosReasonCode reasonCode;
    private MealSource mealSource;
    private Boolean autoCreated;
}
