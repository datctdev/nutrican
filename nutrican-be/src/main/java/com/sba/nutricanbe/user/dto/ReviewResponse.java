package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private UUID id;
    private UUID ptId;
    private UUID reviewerId;
    private String reviewerName;
    private Double rating;
    private String comment;
    private LocalDateTime createdAt;
}
