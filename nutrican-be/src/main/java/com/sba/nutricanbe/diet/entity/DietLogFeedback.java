package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "diet_log_feedback")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class DietLogFeedback extends BaseEntity {

    @Column(name = "diet_log_id", nullable = false, unique = true)
    private UUID dietLogId;

    @Column(name = "energy_rating")
    private Integer energyRating;

    @Column(name = "hunger_after_rating")
    private Integer hungerAfterRating;

    @Column(name = "digestion_status", length = 10)
    private String digestionStatus;

    @Column(name = "digestion_note", columnDefinition = "TEXT")
    private String digestionNote;
}
