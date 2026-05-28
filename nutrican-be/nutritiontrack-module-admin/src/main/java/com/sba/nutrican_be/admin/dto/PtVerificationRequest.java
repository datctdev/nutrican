package com.sba.nutrican_be.admin.dto;

import lombok.Data;

@Data
public class PtVerificationRequest {
    private String action;
    private String ptType;
    private Boolean isVerified;
    private Boolean approved;  // Alternative field name from frontend
    private String adminNote;
}
