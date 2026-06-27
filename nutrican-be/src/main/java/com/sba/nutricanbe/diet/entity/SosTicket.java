package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import java.util.UUID;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.enums.SosReasonCode;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sos_tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"dietLog"})
public class SosTicket extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diet_log_id")
    private DietLog dietLog;

    @Column(name = "pt_id")
    private UUID ptId;

    @Column(name = "assigned_by")
    private UUID assignedById;

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
