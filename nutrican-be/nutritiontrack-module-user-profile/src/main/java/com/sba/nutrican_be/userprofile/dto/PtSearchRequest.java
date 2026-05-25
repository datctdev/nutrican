package com.sba.nutrican_be.userprofile.dto;

import lombok.Data;

@Data
public class PtSearchRequest {
    private String specialization;
    private Integer minExperience;
    private Boolean verifiedOnly;
    private String tier;
    private String sortBy = "tier";
    private String sortDir = "desc";
    private int page = 0;
    private int size = 10;
}
