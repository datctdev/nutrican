package com.sba.nutrican_be.core.entity;

import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.MealType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "diet_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"customer", "ptReviewer"})
public class DietLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_object_name", length = 500)
    private String imageObjectName;

    @Column(name = "ai_confidence_score", precision = 3, scale = 2)
    private BigDecimal aiConfidenceScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "macros_json", columnDefinition = "jsonb")
    private Map<String, Object> macrosJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", length = 20)
    private MealType mealType;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private DietLogStatus status = DietLogStatus.PENDING_AI;

    @Column(name = "food_description", columnDefinition = "TEXT")
    private String foodDescription;

    @Column(name = "sos_ticket_flag")
    @Builder.Default
    private Boolean sosTicketFlag = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pt_reviewer_id")
    private User ptReviewer;

    @Column(name = "pt_note", columnDefinition = "TEXT")
    private String ptNote;

    @Column(name = "log_date")
    private LocalDate logDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
