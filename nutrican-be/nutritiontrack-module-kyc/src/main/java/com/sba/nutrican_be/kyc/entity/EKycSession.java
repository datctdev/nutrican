package com.sba.nutrican_be.kyc.entity;

import com.sba.nutrican_be.core.entity.BaseEntity;
import com.sba.nutrican_be.kyc.valueObjects.KycStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Data
@Entity
@Table(name = "sessions")
@EqualsAndHashCode(callSuper = false)
public class EKycSession extends BaseEntity {

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycStatus status = KycStatus.DRAFT;

    private UUID frontFileId;
    private UUID backFileId;
    private UUID selfieFileId;

    private String frontHash;
    private String backHash;
    private String selfieHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String providerTrace;
}
