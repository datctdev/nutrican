package com.sba.nutrican_be.auth.dto;

import lombok.Data;

@Data
public class LogoutRequest {
    private String refreshToken;
}
