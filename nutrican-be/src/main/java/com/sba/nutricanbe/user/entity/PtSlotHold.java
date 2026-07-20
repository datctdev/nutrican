package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.SlotHoldStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pt_slot_holds")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class PtSlotHold extends BaseEntity {

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private SlotHoldStatus status = SlotHoldStatus.ACTIVE;
}
