package com.sba.nutricanbe.user.dto;

import lombok.Data;
import java.util.Map;

@Data
public class SubmitPtUpdateRequest {
    private Map<String, Object> requestedData;
    private String reason;
}