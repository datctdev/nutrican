package com.sba.nutrican_be.kyc.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class KycRequest {
    @NotBlank(message = "ID card number is required")
    private String idCardNumber;

    @NotBlank(message = "Full name on card is required")
    private String fullNameOnCard;

    private String idCardFrontUrl;
    private String idCardBackUrl;
    private LocalDate dateOfBirthOnCard;
    private String addressOnCard;
}
