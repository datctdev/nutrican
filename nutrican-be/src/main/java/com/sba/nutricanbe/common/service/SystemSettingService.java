package com.sba.nutricanbe.common.service;

import java.math.BigDecimal;

public interface SystemSettingService {

    boolean isRequireKycForPt();

    void setRequireKycForPt(boolean value);

    /** Platform fee % from SystemSetting only (no env fallback). */
    BigDecimal getPlatformFeeRate();

    void setPlatformFeeRate(BigDecimal rate);
}
