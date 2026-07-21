package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.RefundReason;
import lombok.Data;

import java.util.UUID;

@Data
public class RefundCreateRequest {
    private UUID mappingId;
    private RefundReason reason;
    private String note;
}
