package com.sba.nutrican_be.kyc.entity;


import com.sba.nutrican_be.core.entity.BaseEntity;
import com.sba.nutrican_be.kyc.valueObjects.KycDocumentType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.UUID;

@Data
@Entity
@Table(name = "ekyc_document")
@EqualsAndHashCode(callSuper = false)
public class EKycDocument extends BaseEntity {

    @Column(nullable = false)
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycDocumentType type;

    private String fileHash;

}
