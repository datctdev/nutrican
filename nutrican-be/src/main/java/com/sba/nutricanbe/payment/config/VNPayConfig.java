package com.sba.nutricanbe.payment.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Configuration
public class VNPayConfig {

    @Value("${vnpay.tmnCode}")
    private String tmnCode;

    @Value("${vnpay.hashSecret}")
    private String hashSecret;

    @Value("${vnpay.payUrl}")
    private String payUrl;

    @Value("${vnpay.returnUrl}")
    private String returnUrl;

    /** Optional. When blank, rely on IPN URL configured in the VNPay merchant portal. */
    @Value("${vnpay.ipnUrl:}")
    private String ipnUrl;

    public String buildQueryString(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> hasValue(entry.getValue()))
                .map(entry -> entry.getKey() + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    public String hmacSHA512(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(
                    key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac.init(secretKey);
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot create VNPay checksum", exception);
        }
    }

    public void validate() {
        if (!hasValue(tmnCode) || !hasValue(hashSecret)
                || !hasValue(payUrl) || !hasValue(returnUrl)) {
            throw new IllegalStateException("VNPay configuration is incomplete");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private boolean hasValue(String value) {
        return value != null && !value.isBlank();
    }
}
