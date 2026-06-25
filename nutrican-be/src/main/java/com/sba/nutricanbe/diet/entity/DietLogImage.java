package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;
import com.sba.nutricanbe.common.dto.MacroNutrients;

@Entity
@Table(name = "diet_log_images")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class DietLogImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diet_log_id", nullable = false)
    @ToString.Exclude
    private DietLog dietLog;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_object_name", nullable = false, length = 500)
    private String imageObjectName;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private Boolean isPrimary = false;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "ai_confidence_score", precision = 3, scale = 2)
    private BigDecimal aiConfidenceScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "macros_json", columnDefinition = "jsonb")
    private MacroNutrients macrosJson;
}
