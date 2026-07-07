package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.MilestoneType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "client_goal_milestones")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class ClientGoalMilestone extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "milestone_type", nullable = false)
    private MilestoneType milestoneType;

    @Column(nullable = false)
    private String title;

    @Column(name = "achieved_at")
    private LocalDateTime achievedAt;

    @Column(columnDefinition = "TEXT")
    private String note;
}
