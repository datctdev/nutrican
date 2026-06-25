package com.sba.nutricanbe.common.entity;

import com.sba.nutricanbe.common.enums.KycStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.Accessors;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@Accessors(chain = true)
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
