package com.sba.nutricanbe.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateChatNotificationPreferenceRequest {

    @NotNull
    private Boolean enabled;
}
