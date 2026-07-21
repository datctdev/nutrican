package com.sba.nutricanbe.payment.service.impl;

import com.sba.nutricanbe.payment.config.VNPayConfig;
import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.service.CoachingVnPayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class CoachingVnPayServiceImpl implements CoachingVnPayService {

    private static final DateTimeFormatter VNP_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VNPayConfig vnPayConfig;

    @Override
    public String buildPaymentUrl(Payment payment) {
        vnPayConfig.validate();
        LocalDateTime now = LocalDateTime.now();
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        params.put("vnp_TxnRef", payment.getTxnRef());
        params.put("vnp_OrderInfo", buildOrderInfo(payment.getOrderNumber()));
        params.put("vnp_OrderType", "other");
        params.put("vnp_Amount", payment.getAmount().multiply(BigDecimal.valueOf(100)).toBigInteger().toString());
        params.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        // vnp_IpnUrl is NOT a valid vpcpay.html request parameter. Including it in the
        // signed payload makes VNPay reject the request with code 70 (invalid signature).
        // The IPN endpoint must be registered in the merchant portal instead.
        params.put("vnp_IpAddr", "127.0.0.1");
        params.put("vnp_CreateDate", now.format(VNP_TIME));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ExpireDate", now.plusMinutes(30).format(VNP_TIME));

        String hashData = vnPayConfig.buildQueryString(params);
        String secureHash = vnPayConfig.hmacSHA512(vnPayConfig.getHashSecret(), hashData);

        return vnPayConfig.getPayUrl() + "?" + hashData
                + "&vnp_SecureHash=" + secureHash;
    }

    @Override
    public boolean verifyChecksumFromMap(Map<String, String> params) {
        vnPayConfig.validate();
        if (params == null || params.isEmpty()) {
            return false;
        }
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }
        Map<String, String> signedParams = new HashMap<>(params);
        signedParams.remove("vnp_SecureHash");
        signedParams.remove("vnp_SecureHashType");
        String hashData = vnPayConfig.buildQueryString(new TreeMap<>(signedParams));
        String calculatedHash = vnPayConfig.hmacSHA512(
                vnPayConfig.getHashSecret(), hashData);
        return calculatedHash.equalsIgnoreCase(receivedHash);
    }

    private String buildOrderInfo(String orderNumber) {
        String normalizedOrderNumber = orderNumber == null
                ? ""
                : orderNumber.replaceAll("[^A-Za-z0-9]", "");
        return ("Thanh toan goi coaching " + normalizedOrderNumber).trim();
    }

}
