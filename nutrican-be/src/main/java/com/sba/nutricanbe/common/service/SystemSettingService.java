package com.sba.nutricanbe.common.service;

public interface SystemSettingService {

    boolean isRequireKycForPt();

    void setRequireKycForPt(boolean value);
}
