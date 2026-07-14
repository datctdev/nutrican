package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.BodyMetric;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class BodyMetricDto {
    private UUID id;
    private LocalDate recordDate;
    private BigDecimal weight;
    private BigDecimal bodyFatPercent;
    private BigDecimal muscleMass;
    private BigDecimal lbm;
    private String note;

    public static BodyMetricDto from(BodyMetric m) {
        return BodyMetricDto.builder()
                .id(m.getId())
                .recordDate(m.getRecordDate())
                .weight(m.getWeight())
                .bodyFatPercent(m.getBodyFatPercent())
                .muscleMass(m.getMuscleMass())
                .lbm(m.getLbm())
                .note(m.getNote())
                .build();
    }
}
