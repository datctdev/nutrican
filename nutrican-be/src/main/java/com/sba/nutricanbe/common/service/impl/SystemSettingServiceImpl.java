package com.sba.nutricanbe.common.service.impl;

import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.common.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class SystemSettingServiceImpl implements SystemSettingService {

    private static final String REQUIRE_KYC_FOR_PT = "REQUIRE_KYC_FOR_PT";
    private static final boolean REQUIRE_KYC_DEFAULT = true;
    public static final String PLATFORM_FEE_RATE = "PLATFORM_FEE_RATE";
    /** Seeded default for local/dev when setting is first created. */
    public static final String PLATFORM_FEE_RATE_DEFAULT = "10";

    private final SystemSettingRepository systemSettingRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean isRequireKycForPt() {
        return systemSettingRepository.findById(REQUIRE_KYC_FOR_PT)
                .map(setting -> Boolean.parseBoolean(setting.getValue()))
                .orElse(REQUIRE_KYC_DEFAULT);
    }

    @Override
    @Transactional
    public void setRequireKycForPt(boolean value) {
        SystemSetting setting = SystemSetting.builder()
                .key(REQUIRE_KYC_FOR_PT)
                .value(String.valueOf(value))
                .build();
        systemSettingRepository.save(setting);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getPlatformFeeRate() {
        SystemSetting setting = systemSettingRepository.findById(PLATFORM_FEE_RATE)
                .orElseThrow(() -> new BadRequestException(
                        "PLATFORM_FEE_RATE is not configured in system settings"));
        try {
            BigDecimal rate = new BigDecimal(setting.getValue());
            if (rate.signum() < 0 || rate.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BadRequestException("PLATFORM_FEE_RATE must be between 0 and 100");
            }
            return rate;
        } catch (NumberFormatException ex) {
            throw new BadRequestException("PLATFORM_FEE_RATE has invalid value: " + setting.getValue());
        }
    }

    @Override
    @Transactional
    public void setPlatformFeeRate(BigDecimal rate) {
        if (rate == null || rate.signum() < 0 || rate.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Platform fee rate must be between 0 and 100");
        }
        SystemSetting setting = SystemSetting.builder()
                .key(PLATFORM_FEE_RATE)
                .value(rate.stripTrailingZeros().toPlainString())
                .build();
        systemSettingRepository.save(setting);
    }
}
