package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.user.enums.DietPreference;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateClientRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String phoneNumber;
    private Integer heightCm;
    private String gender;
    private LocalDate dateOfBirth;
    private java.math.BigDecimal weight;
    private java.math.BigDecimal bodyFatPercent;
    private java.math.BigDecimal tdee;
    private String allergyNotes;
    private DietPreference dietPreference;
    private String specialNotes;
}
