package com.sba.nutricanbe.user.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExtraSessionsRequest {
    private List<LocalDateTime> sessionStarts;
    /** WALLET or VNPAY */
    private String payMethod;
}
