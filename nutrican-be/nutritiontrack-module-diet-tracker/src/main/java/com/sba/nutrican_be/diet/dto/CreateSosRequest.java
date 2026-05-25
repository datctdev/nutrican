package com.sba.nutrican_be.diet.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class CreateSosRequest {
    private UUID dietLogId;
    private String note;
    private String priority;
}
