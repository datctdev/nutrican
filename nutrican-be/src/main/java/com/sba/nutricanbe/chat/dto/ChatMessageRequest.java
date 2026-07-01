package com.sba.nutricanbe.chat.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    @NotNull
    private UUID mappingId;

    @Size(max = 2000)
    private String content;

    @Size(max = 1000)
    private String imageUrl;
}
