package com.sba.nutrican_be.diet.dto;

import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.SosReasonCode;
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
