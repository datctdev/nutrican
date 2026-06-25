package com.sba.nutricanbe.user.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String address;
    private String dateOfBirth;
}
