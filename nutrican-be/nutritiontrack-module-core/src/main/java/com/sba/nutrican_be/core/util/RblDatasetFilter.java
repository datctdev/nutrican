package com.sba.nutrican_be.core.util;

import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.enums.PtReviewAction;
import com.sba.nutrican_be.core.enums.RecognitionSource;

public final class RblDatasetFilter {

    private RblDatasetFilter() {}

    public static boolean isReviewed(DietLog log) {
        return log.getPtReviewedAt() != null && log.getPtAction() != null;
    }

    public static boolean isLabeledForMae(DietLog log) {
        return isReviewed(log)
                && (log.getPtAction() == PtReviewAction.APPROVE || log.getPtAction() == PtReviewAction.ADJUST)
                && log.getPtAdjustedMacros() != null
                && log.getAiPredictedMacros() != null;
    }

    public static boolean isCvOnly(DietLog log) {
        return log.getRecognitionSource() != null && log.getRecognitionSource() != RecognitionSource.MANUAL;
    }

    public static boolean isNegativeSample(DietLog log) {
        return log.getPtAction() == PtReviewAction.REJECT;
    }

    public static boolean matchesExport(DietLog log, boolean cvOnly, boolean includeRejected) {
        if (!isReviewed(log)) {
            return false;
        }
        if (cvOnly && !isCvOnly(log)) {
            return false;
        }
        if (!includeRejected && isNegativeSample(log)) {
            return false;
        }
        return true;
    }
}
