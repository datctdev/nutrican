package com.sba.nutricanbe.common.config;


import lombok.Data;

import java.util.UUID;

@Data
public class CurrentUserInfo {
    private UUID userId;
    private String username;
    private String role;

}
