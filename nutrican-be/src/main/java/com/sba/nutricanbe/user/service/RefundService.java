package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.RefundCreateRequest;
import com.sba.nutricanbe.user.dto.RefundReviewRequest;
import com.sba.nutricanbe.user.entity.RefundRequest;

import java.util.List;
import java.util.UUID;

public interface RefundService {

    RefundRequest requestRefund(UUID customerId, RefundCreateRequest request);

    List<RefundRequest> listAll();

    RefundRequest review(UUID refundId, RefundReviewRequest request);
}
