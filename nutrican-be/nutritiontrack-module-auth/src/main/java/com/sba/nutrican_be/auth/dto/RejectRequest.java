package com.sba.nutrican_be.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectRequest {
    @NotBlank(message = "Rejection reason is required")
    private String reason;
}
