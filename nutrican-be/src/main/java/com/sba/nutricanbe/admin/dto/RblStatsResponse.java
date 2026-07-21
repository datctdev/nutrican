package com.sba.nutricanbe.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
public class RblStatsResponse {
    private int totalReviewed;
    private int totalLabeledCv;
    private int legacyLogsExcluded;
    private boolean insufficientSample;
    private BigDecimal maeAiCalories;
    private BigDecimal maeDbCalories;
    private Map<String, Double> adjustRateByMealSource;
    private Map<String, Double> adjustRateByCohort;
    private Map<String, Map<String, Double>> calibrationBuckets;
    private Map<String, BigDecimal> maeByRecognitionSource;
    private Map<String, BigDecimal> maeByDbMatchScoreBucket;
    private Map<String, Integer> topCorrectionReasons;
    private double foodDbCoverage;
    private BigDecimal blindVsAiMae;
    private BigDecimal blindVsPtMae;
    private int compositeMealCount;
    private double avgTimeToReviewHours;
    private Map<String, Integer> cohortCounts;
    private Map<String, BigDecimal> maeByCohortKey;
    private Map<String, Integer> cohortKeyCounts;
}
