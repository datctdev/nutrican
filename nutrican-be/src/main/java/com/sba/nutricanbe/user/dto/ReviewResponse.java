package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.Review;
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
    private Boolean isAnonymous;
    private String imageUrl;
    private LocalDateTime createdAt;

    public static ReviewResponse toReviewResponse(Review review) {
        boolean isAnon = Boolean.TRUE.equals(review.getIsAnonymous());
        String displayName = isAnon ? "Học viên ẩn danh" : review.getReviewer().getFullName();

        return ReviewResponse.builder()
                .id(review.getId())
                .ptId(review.getPt().getId())
                .reviewerId(review.getReviewer().getId())
                .reviewerName(displayName)
                .rating(review.getRating())
                .comment(review.getComment())
                .isAnonymous(isAnon)
                .imageUrl(review.getImageUrl())
                .createdAt(review.getCreatedAt())
                .build();
    }
}