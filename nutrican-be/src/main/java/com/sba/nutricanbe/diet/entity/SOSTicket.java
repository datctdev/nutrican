package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.enums.SosReasonCode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "sos_tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"dietLog", "pt", "assignedBy"})
public class SosTicket extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diet_log_id")
    private DietLog dietLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pt_id")
    private User pt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private SosTicketStatus status = SosTicketStatus.OPEN;

    @Column(name = "priority", length = 20)
    @Builder.Default
    private String priority = "HIGH";

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", length = 30)
    private SosReasonCode reasonCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_source", length = 20)
    private MealSource mealSource;

    @Column(name = "auto_created")
    @Builder.Default
    private Boolean autoCreated = false;
}
