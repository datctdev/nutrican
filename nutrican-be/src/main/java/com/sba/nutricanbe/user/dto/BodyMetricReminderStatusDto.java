package com.sba.nutricanbe.user.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BodyMetricReminderStatusDto {
    private boolean showReminder;
    private Integer daysSinceLastLog;
}
