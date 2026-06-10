package com.sba.nutrican_be.admin.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutrican_be.admin.dto.RblExportRowDto;
import com.sba.nutrican_be.admin.dto.RblStatsResponse;
import com.sba.nutrican_be.admin.service.RblAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.entity.DietLogItem;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.PtReviewAction;
import com.sba.nutrican_be.core.enums.RecognitionSource;
import com.sba.nutrican_be.core.enums.SosReasonCode;
import com.sba.nutrican_be.core.repository.DietLogRepository;
import com.sba.nutrican_be.core.repository.PtClientMappingRepository;
import com.sba.nutrican_be.core.repository.SOSTicketRepository;
import com.sba.nutrican_be.core.util.MacroUtils;
import com.sba.nutrican_be.core.util.RblDatasetFilter;
import com.sba.nutrican_be.core.util.RblMetricsUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RblAdminServiceImpl implements RblAdminService {

    private final DietLogRepository dietLogRepository;
    private final SOSTicketRepository sosTicketRepository;
    private final PtClientMappingRepository mappingRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<RblExportRowDto>> exportPreview(LocalDate from, LocalDate to, boolean cvOnly, boolean includeRejected) {
        LocalDate start = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate end = to != null ? to : LocalDate.now();
        List<RblExportRowDto> rows = loadRows(start, end, null, null, cvOnly, includeRejected);
        List<RblExportRowDto> preview = rows.stream().limit(10).toList();
        return ApiResponse.success(preview, "Preview: " + rows.size() + " total rows");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<byte[]> exportCsv(LocalDate from, LocalDate to, MealSource mealSource,
                                          RecognitionSource recognitionSource, boolean cvOnly, boolean includeRejected) {
        LocalDate start = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate end = to != null ? to : LocalDate.now();
        List<RblExportRowDto> rows = loadRows(start, end, mealSource, recognitionSource, cvOnly, includeRejected);
        StringBuilder csv = new StringBuilder();
        csv.append("# food_db_version=v2-60\n");
        csv.append("log_id,log_date,meal_source,meal_complexity,recognition_source,experiment_cohort,ai_confidence,db_match_score,");
        csv.append("model_version,prompt_version,ai_food_name,db_food_name,ai_cal,ai_pro,ai_carb,ai_fat,db_cal,db_pro,db_carb,db_fat,");
        csv.append("pt_cal,pt_pro,pt_carb,pt_fat,delta_ai_cal,delta_db_cal,pt_action,pt_correction_reason,pt_reviewed_at,");
        csv.append("sos_ticket_flag,sos_reason_code,fields_changed,customer_id_hash,image_object_name\n");
        for (RblExportRowDto r : rows) {
            csv.append(r.getLogId()).append(',');
            csv.append(r.getLogDate()).append(',');
            csv.append(safe(r.getMealSource())).append(',');
            csv.append(safe(r.getMealComplexity())).append(',');
            csv.append(safe(r.getRecognitionSource())).append(',');
            csv.append(safe(r.getExperimentCohort())).append(',');
            csv.append(r.getAiConfidence()).append(',');
            csv.append(r.getDbMatchScore()).append(',');
            csv.append(safe(r.getModelVersion())).append(',');
            csv.append(safe(r.getPromptVersion())).append(',');
            csv.append(safe(r.getAiFoodName())).append(',');
            csv.append(safe(r.getDbFoodName())).append(',');
            csv.append(macro(r.getAiPredictedMacros(), "calories")).append(',');
            csv.append(macro(r.getAiPredictedMacros(), "protein")).append(',');
            csv.append(macro(r.getAiPredictedMacros(), "carbs")).append(',');
            csv.append(macro(r.getAiPredictedMacros(), "fat")).append(',');
            csv.append(macro(r.getDbMatchedMacros(), "calories")).append(',');
            csv.append(macro(r.getDbMatchedMacros(), "protein")).append(',');
            csv.append(macro(r.getDbMatchedMacros(), "carbs")).append(',');
            csv.append(macro(r.getDbMatchedMacros(), "fat")).append(',');
            csv.append(macro(r.getPtAdjustedMacros(), "calories")).append(',');
            csv.append(macro(r.getPtAdjustedMacros(), "protein")).append(',');
            csv.append(macro(r.getPtAdjustedMacros(), "carbs")).append(',');
            csv.append(macro(r.getPtAdjustedMacros(), "fat")).append(',');
            csv.append(r.getDeltaAiCalories()).append(',');
            csv.append(r.getDeltaDbCalories()).append(',');
            csv.append(safe(r.getPtAction())).append(',');
            csv.append(safe(r.getPtCorrectionReason())).append(',');
            csv.append(r.getPtReviewedAt()).append(',');
            csv.append(r.getSosTicketFlag()).append(',');
            csv.append(safe(r.getSosReasonCode())).append(',');
            csv.append(safe(r.getFieldsChanged())).append(',');
            csv.append(safe(r.getCustomerIdHash())).append(',');
            csv.append(safe(r.getImageObjectName())).append('\n');
        }
        return ApiResponse.success(csv.toString().getBytes(StandardCharsets.UTF_8), "Exported " + rows.size() + " rows");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<RblStatsResponse> getStats(LocalDate from, LocalDate to) {
        return ApiResponse.success(buildStats(loadReviewed(from, to), loadReviewed(from, to)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<String> generateReport(LocalDate from, LocalDate to) {
        RblStatsResponse stats = buildStats(loadReviewed(from, to), loadReviewed(from, to));
        StringBuilder md = new StringBuilder();
        md.append("# NutriCan RBL Research Report\n\n");
        md.append("## Summary\n");
        md.append("- Total reviewed: ").append(stats.getTotalReviewed()).append("\n");
        md.append("- CV labeled samples: ").append(stats.getTotalLabeledCv()).append("\n");
        md.append("- MAE AI calories: ").append(stats.getMaeAiCalories()).append("\n");
        md.append("- MAE DB calories: ").append(stats.getMaeDbCalories()).append("\n");
        md.append("- Insufficient sample (<30): ").append(stats.isInsufficientSample()).append("\n\n");
        md.append("## Adjust rate by meal source\n");
        if (stats.getAdjustRateByMealSource() != null) {
            stats.getAdjustRateByMealSource().forEach((k, v) ->
                    md.append("- ").append(k).append(": ").append(String.format("%.1f%%", v * 100)).append("\n"));
        }
        md.append("\n## Hypothesis checklist\n");
        md.append("- [ ] Restaurant MAE > Home MAE\n");
        md.append("- [ ] Hybrid MAE < AI-only MAE\n");
        md.append("- [ ] High confidence → lower adjust rate\n");
        return ApiResponse.success(md.toString(), "Report generated");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<RblStatsResponse> getPtStats(UUID ptId, LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate end = to != null ? to : LocalDate.now();
        List<UUID> clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                .map(m -> m.getClient().getId()).toList();
        List<DietLog> logs = clientIds.isEmpty()
                ? List.of()
                : dietLogRepository.findReviewedByCustomersBetween(clientIds, start, end);
        return ApiResponse.success(buildStats(logs, logs));
    }

    private List<DietLog> loadReviewed(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate end = to != null ? to : LocalDate.now();
        return dietLogRepository.findReviewedBetween(start, end);
    }

    private List<RblExportRowDto> loadRows(LocalDate from, LocalDate to, MealSource mealSource,
                                            RecognitionSource recognitionSource, boolean cvOnly, boolean includeRejected) {
        return loadReviewed(from, to).stream()
                .filter(l -> RblDatasetFilter.matchesExport(l, cvOnly, includeRejected))
                .filter(l -> mealSource == null || l.getMealSource() == mealSource)
                .filter(l -> recognitionSource == null || l.getRecognitionSource() == recognitionSource)
                .map(this::toExportRow)
                .collect(Collectors.toList());
    }

    private RblExportRowDto toExportRow(DietLog log) {
        SosReasonCode sosReason = null;
        List<SOSTicket> tickets = sosTicketRepository.findByDietLog_Id(log.getId());
        if (!tickets.isEmpty()) {
            sosReason = tickets.get(0).getReasonCode();
        }
        String fieldsChanged = MacroUtils.fieldsChanged(log.getMacrosAtReview(), log.getPtAdjustedMacros());
        return RblExportRowDto.builder()
                .logId(log.getId())
                .logDate(log.getLogDate())
                .mealSource(log.getMealSource() != null ? log.getMealSource().name() : null)
                .mealComplexity(log.getMealComplexity() != null ? log.getMealComplexity().name() : null)
                .recognitionSource(log.getRecognitionSource() != null ? log.getRecognitionSource().name() : null)
                .experimentCohort(log.getExperimentCohort() != null ? log.getExperimentCohort().name() : null)
                .aiConfidence(log.getAiConfidenceScore())
                .dbMatchScore(log.getDbMatchScore())
                .modelVersion(log.getModelVersion())
                .promptVersion(log.getPromptVersion())
                .aiFoodName(log.getAiRawJson() != null ? String.valueOf(log.getAiRawJson().get("foodName")) : null)
                .dbFoodName(log.getMatchedFoodName())
                .aiPredictedMacros(log.getAiPredictedMacros())
                .dbMatchedMacros(log.getDbMatchedMacros())
                .macrosAtReview(log.getMacrosAtReview())
                .ptAdjustedMacros(log.getPtAdjustedMacros())
                .ptBlindMacros(log.getPtBlindMacros())
                .deltaAiCalories(RblMetricsUtil.delta(log.getAiPredictedMacros(), log.getPtAdjustedMacros(), "calories"))
                .deltaDbCalories(RblMetricsUtil.delta(log.getDbMatchedMacros(), log.getPtAdjustedMacros(), "calories"))
                .ptAction(log.getPtAction() != null ? log.getPtAction().name() : null)
                .ptCorrectionReason(log.getPtCorrectionReason() != null ? log.getPtCorrectionReason().name() : null)
                .ptReviewedAt(log.getPtReviewedAt())
                .sosTicketFlag(log.getSosTicketFlag())
                .sosReasonCode(sosReason != null ? sosReason.name() : null)
                .fieldsChanged(fieldsChanged)
                .customerIdHash(RblMetricsUtil.customerHash(log.getCustomer() != null ? log.getCustomer().getId() : null))
                .imageObjectName(log.getImageObjectName())
                .dietLogItemsJson(itemsJson(log.getItems()))
                .build();
    }

    private Object itemsJson(List<DietLogItem> items) {
        if (items == null || items.isEmpty()) return List.of();
        return items.stream().map(i -> Map.of(
                "itemName", i.getItemName() != null ? i.getItemName() : "",
                "quantityG", i.getQuantityG() != null ? i.getQuantityG() : 0,
                "calories", i.getCalories() != null ? i.getCalories() : 0
        )).toList();
    }

    private RblStatsResponse buildStats(List<DietLog> reviewed, List<DietLog> allReviewed) {
        List<DietLog> labeled = reviewed.stream().filter(RblDatasetFilter::isLabeledForMae).toList();
        List<DietLog> cvLabeled = labeled.stream().filter(RblMetricsUtil::isCvLog).toList();
        long legacyExcluded = reviewed.stream().filter(l -> l.getAiPredictedMacros() == null).count();

        Map<String, Double> adjustBySource = new LinkedHashMap<>();
        adjustBySource.put("HOME_COOKED", RblMetricsUtil.adjustRateByMealSource(reviewed, MealSource.HOME_COOKED));
        adjustBySource.put("RESTAURANT", RblMetricsUtil.adjustRateByMealSource(reviewed, MealSource.RESTAURANT));

        Map<String, BigDecimal> maeByRec = new LinkedHashMap<>();
        List<DietLog> aiOnly = cvLabeled.stream().filter(l -> l.getRecognitionSource() == RecognitionSource.AI_ONLY).toList();
        List<DietLog> hybrid = cvLabeled.stream().filter(l -> l.getRecognitionSource() == RecognitionSource.HYBRID).toList();
        maeByRec.put("AI_ONLY", maeCalories(aiOnly));
        maeByRec.put("HYBRID", maeCalories(hybrid));

        Map<String, Integer> reasons = reviewed.stream()
                .filter(l -> l.getPtCorrectionReason() != null)
                .collect(Collectors.groupingBy(l -> l.getPtCorrectionReason().name(),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

        long sosCount = reviewed.stream().filter(l -> Boolean.TRUE.equals(l.getSosTicketFlag())).count();
        long sosReviewed = reviewed.stream()
                .filter(l -> Boolean.TRUE.equals(l.getSosTicketFlag()) && l.getPtReviewedAt() != null).count();
        long sosAdjust = reviewed.stream()
                .filter(l -> Boolean.TRUE.equals(l.getSosTicketFlag()) && l.getPtAction() == PtReviewAction.ADJUST).count();
        long sosLowConf = reviewed.stream()
                .filter(l -> Boolean.TRUE.equals(l.getSosTicketFlag())
                        && l.getAiConfidenceScore() != null
                        && l.getAiConfidenceScore().compareTo(new BigDecimal("0.6")) < 0).count();

        double avgHours = reviewed.stream()
                .filter(l -> l.getPtReviewedAt() != null && l.getCreatedAt() != null)
                .mapToDouble(l -> ChronoUnit.MINUTES.between(l.getCreatedAt(), l.getPtReviewedAt()) / 60.0)
                .average().orElse(0);

        long withDb = cvLabeled.stream().filter(l -> l.getFoodItemId() != null).count();
        double dbCoverage = cvLabeled.isEmpty() ? 0 : (double) withDb / cvLabeled.size();

        List<DietLog> blindLogs = reviewed.stream().filter(l -> l.getPtBlindMacros() != null).toList();

        Map<String, Double> adjustByCohort = reviewed.stream()
                .filter(l -> l.getExperimentCohort() != null)
                .collect(Collectors.groupingBy(l -> l.getExperimentCohort().name(),
                        Collectors.collectingAndThen(Collectors.toList(), RblMetricsUtil::adjustRate)));

        return RblStatsResponse.builder()
                .totalReviewed(reviewed.size())
                .totalLabeledCv(cvLabeled.size())
                .totalSos((int) sosCount)
                .legacyLogsExcluded((int) legacyExcluded)
                .insufficientSample(cvLabeled.size() < 30)
                .maeAiCalories(maeCalories(cvLabeled))
                .maeDbCalories(maeDbCalories(cvLabeled))
                .adjustRateByMealSource(adjustBySource)
                .adjustRateByCohort(adjustByCohort)
                .calibrationBuckets(buildCalibrationBuckets(cvLabeled))
                .maeByDbMatchScoreBucket(buildMaeByDbMatchScore(cvLabeled))
                .maeByRecognitionSource(maeByRec)
                .topCorrectionReasons(reasons)
                .sosToReviewRate(sosCount == 0 ? 0 : (double) sosReviewed / sosCount)
                .sosToAdjustRate(sosCount == 0 ? 0 : (double) sosAdjust / sosCount)
                .sosLowConfidenceRate(sosCount == 0 ? 0 : (double) sosLowConf / sosCount)
                .foodDbCoverage(dbCoverage)
                .blindVsAiMae(maeBlindVs(cvLabeled, "ai"))
                .blindVsPtMae(maeBlindVs(blindLogs, "pt"))
                .compositeMealCount((int) reviewed.stream().filter(l -> l.getMealComplexity() != null
                        && l.getMealComplexity().name().equals("COMPOSITE")).count())
                .avgTimeToReviewHours(BigDecimal.valueOf(avgHours).setScale(2, RoundingMode.HALF_UP).doubleValue())
                .build();
    }

    private Map<String, Map<String, Double>> buildCalibrationBuckets(List<DietLog> cvLabeled) {
        Map<String, List<DietLog>> buckets = new LinkedHashMap<>();
        buckets.put("0.0-0.5", new ArrayList<>());
        buckets.put("0.5-0.7", new ArrayList<>());
        buckets.put("0.7-0.9", new ArrayList<>());
        buckets.put("0.9-1.0", new ArrayList<>());
        for (DietLog log : cvLabeled) {
            double conf = log.getAiConfidenceScore() != null ? log.getAiConfidenceScore().doubleValue() : 0;
            if (conf < 0.5) buckets.get("0.0-0.5").add(log);
            else if (conf < 0.7) buckets.get("0.5-0.7").add(log);
            else if (conf < 0.9) buckets.get("0.7-0.9").add(log);
            else buckets.get("0.9-1.0").add(log);
        }
        Map<String, Map<String, Double>> result = new LinkedHashMap<>();
        for (var entry : buckets.entrySet()) {
            Map<String, Double> stats = new LinkedHashMap<>();
            stats.put("count", (double) entry.getValue().size());
            stats.put("mae", maeCalories(entry.getValue()).doubleValue());
            result.put(entry.getKey(), stats);
        }
        return result;
    }

    private Map<String, BigDecimal> buildMaeByDbMatchScore(List<DietLog> cvLabeled) {
        Map<String, List<DietLog>> buckets = new LinkedHashMap<>();
        buckets.put("0", new ArrayList<>());
        buckets.put("1-5", new ArrayList<>());
        buckets.put("6-10", new ArrayList<>());
        buckets.put("10+", new ArrayList<>());
        for (DietLog log : cvLabeled) {
            int score = log.getDbMatchScore() != null ? log.getDbMatchScore() : 0;
            if (score == 0) buckets.get("0").add(log);
            else if (score <= 5) buckets.get("1-5").add(log);
            else if (score <= 10) buckets.get("6-10").add(log);
            else buckets.get("10+").add(log);
        }
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        for (var entry : buckets.entrySet()) {
            result.put(entry.getKey(), maeCalories(entry.getValue()));
        }
        return result;
    }

    private BigDecimal maeCalories(List<DietLog> logs) {
        if (logs.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = BigDecimal.ZERO;
        int n = 0;
        for (DietLog log : logs) {
            BigDecimal d = RblMetricsUtil.delta(log.getAiPredictedMacros(), log.getPtAdjustedMacros(), "calories");
            if (d != null) { sum = sum.add(d); n++; }
        }
        return n == 0 ? BigDecimal.ZERO : sum.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal maeDbCalories(List<DietLog> logs) {
        if (logs.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = BigDecimal.ZERO;
        int n = 0;
        for (DietLog log : logs) {
            if (log.getDbMatchedMacros() == null) continue;
            BigDecimal d = RblMetricsUtil.delta(log.getDbMatchedMacros(), log.getPtAdjustedMacros(), "calories");
            if (d != null) { sum = sum.add(d); n++; }
        }
        return n == 0 ? BigDecimal.ZERO : sum.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal maeBlindVs(List<DietLog> logs, String target) {
        if (logs.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = BigDecimal.ZERO;
        int n = 0;
        for (DietLog log : logs) {
            Map<String, Object> other = "ai".equals(target) ? log.getAiPredictedMacros() : log.getPtAdjustedMacros();
            BigDecimal d = RblMetricsUtil.delta(log.getPtBlindMacros(), other, "calories");
            if (d != null) { sum = sum.add(d); n++; }
        }
        return n == 0 ? BigDecimal.ZERO : sum.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
    }

    private String safe(String v) {
        if (v == null) return "";
        return v.replace(",", " ");
    }

    private String macro(Map<String, Object> m, String key) {
        if (m == null) return "";
        return MacroUtils.toBd(m.get(key)).toPlainString();
    }
}
