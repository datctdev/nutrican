package com.sba.nutricanbe.diet.entity;

import java.util.UUID;
import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.ExperimentCohort;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import com.sba.nutricanbe.common.dto.MacroNutrients;

@Entity
@Table(name = "diet_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class DietLog extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_object_name", length = 500)
    private String imageObjectName;

    @Column(name = "ai_confidence_score", precision = 3, scale = 2)
    private BigDecimal aiConfidenceScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "macros_json", columnDefinition = "jsonb")
    private MacroNutrients macrosJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", length = 20)
    private MealType mealType;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_period", length = 20)
    private MealPeriod mealPeriod;

    /** Optional catch-up tag: period already past today; log still belongs to {@link #mealPeriod}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "makeup_for_period", length = 20)
    private MealPeriod makeupForPeriod;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private DietLogStatus status = DietLogStatus.PENDING_AI;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", length = 30)
    @Builder.Default
    private DietLogReviewStatus reviewStatus = DietLogReviewStatus.NOT_REQUIRED;

    @Column(name = "food_description", columnDefinition = "TEXT")
    private String foodDescription;

    @Column(name = "sos_ticket_flag")
    @Builder.Default
    private Boolean sosTicketFlag = false;

    @Column(name = "pt_reviewer_id")
    private UUID ptReviewerId;

    @Column(name = "pt_note", columnDefinition = "TEXT")
    private String ptNote;

    @Column(name = "log_date")
    private LocalDate logDate;

    @Column(name = "late_tick_reason", columnDefinition = "TEXT")
    private String lateTickReason;

    @Column(name = "is_pt_notified")
    @Builder.Default
    private Boolean isPtNotified = false;

    @OneToMany(mappedBy = "dietLog", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    @ToString.Exclude
    private java.util.List<DietLogImage> additionalImages = new java.util.ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_source", length = 20)
    @Builder.Default
    private MealSource mealSource = MealSource.HOME_COOKED;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_complexity", length = 20)
    @Builder.Default
    private MealComplexity mealComplexity = MealComplexity.SIMPLE;

    @Column(name = "restaurant_name", length = 200)
    private String restaurantName;

    @Enumerated(EnumType.STRING)
    @Column(name = "recognition_source", length = 20)
    private RecognitionSource recognitionSource;

    @Column(name = "food_item_id")
    private UUID foodItemId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_raw_json", columnDefinition = "jsonb")
    private Map<String, Object> aiRawJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pt_adjusted_macros", columnDefinition = "jsonb")
    private MacroNutrients ptAdjustedMacros;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_predicted_macros", columnDefinition = "jsonb")
    private MacroNutrients aiPredictedMacros;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "db_matched_macros", columnDefinition = "jsonb")
    private MacroNutrients dbMatchedMacros;

    @Column(name = "db_match_score")
    private Integer dbMatchScore;

    @Column(name = "model_version", length = 100)
    private String modelVersion;

    @Column(name = "prompt_version", length = 16)
    private String promptVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "experiment_cohort", length = 30)
    private ExperimentCohort experimentCohort;

    @Column(name = "experiment_cohort_key", length = 80)
    private String experimentCohortKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "pt_action", length = 20)
    private PtReviewAction ptAction;

    @Column(name = "pt_reviewed_at")
    private LocalDateTime ptReviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "pt_correction_reason", length = 30)
    private PtCorrectionReason ptCorrectionReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "macros_at_review", columnDefinition = "jsonb")
    private MacroNutrients macrosAtReview;

    @Column(name = "matched_food_name", length = 200)
    private String matchedFoodName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pt_blind_macros", columnDefinition = "jsonb")
    private MacroNutrients ptBlindMacros;

    @OneToMany(mappedBy = "dietLog", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private java.util.List<DietLogItem> items = new java.util.ArrayList<>();
}