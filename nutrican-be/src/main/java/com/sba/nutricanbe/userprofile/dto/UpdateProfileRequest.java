package com.sba.nutricanbe.userprofile.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String address;
    private String dateOfBirth;
}
