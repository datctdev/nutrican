package com.sba.nutrican_be.diet.dto;

import lombok.Data;

@Data
public class CreateSosRequest {
    private Long dietLogId;
    private String note;
    private String priority;
}
