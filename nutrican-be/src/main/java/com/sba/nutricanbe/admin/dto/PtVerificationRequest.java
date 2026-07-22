package com.sba.nutricanbe.admin.dto;

import lombok.Data;

@Data
public class PtVerificationRequest {
    private String action;
    private String ptType;
    private Boolean isVerified;
    private Boolean approved;
    private String adminNote;
}
