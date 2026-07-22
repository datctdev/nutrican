package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.ExtraSessionPurchaseStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "extra_session_purchases", indexes = {
        @Index(name = "idx_extra_session_purchase_payment", columnList = "payment_id", unique = true),
        @Index(name = "idx_extra_session_purchase_mapping", columnList = "mapping_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class ExtraSessionPurchase extends BaseEntity {

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Column(name = "payment_id", nullable = false, unique = true)
    private UUID paymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExtraSessionPurchaseStatus status = ExtraSessionPurchaseStatus.PENDING;

    @ElementCollection
    @CollectionTable(
            name = "extra_session_purchase_starts",
            joinColumns = @JoinColumn(name = "purchase_id"))
    @Column(name = "start_time", nullable = false)
    @OrderColumn(name = "ord")
    @Builder.Default
    private List<LocalDateTime> sessionStarts = new ArrayList<>();
}
