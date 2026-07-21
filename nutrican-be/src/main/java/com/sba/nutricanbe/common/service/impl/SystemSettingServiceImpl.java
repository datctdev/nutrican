package com.sba.nutricanbe.common.service.impl;

import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.common.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemSettingServiceImpl implements SystemSettingService {

    private static final String REQUIRE_KYC_FOR_PT = "REQUIRE_KYC_FOR_PT";
    private static final boolean REQUIRE_KYC_DEFAULT = true;

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
}
