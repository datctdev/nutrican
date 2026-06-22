package com.sba.nutrican_be.core.entity;

import com.sba.nutrican_be.core.enums.KycDocumentType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.Accessors;

import java.util.UUID;

@Entity
@Table(name = "ekyc_document")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@Accessors(chain = true)
public class EKycDocument extends BaseEntity {

    @Column(nullable = false)
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycDocumentType type;

    private String fileHash;
}
