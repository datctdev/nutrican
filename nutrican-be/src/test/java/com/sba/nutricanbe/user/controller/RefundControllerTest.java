package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.RefundCreateRequest;
import com.sba.nutricanbe.user.dto.RefundReviewRequest;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.enums.RefundStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import com.sba.nutricanbe.user.service.impl.RefundServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundControllerTest {

    @Mock private RefundRequestRepository refundRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private com.sba.nutricanbe.workspace.service.WebSocketSessionService webSocketSessionService;
    @Mock private CoachingWalletService coachingWalletService;

    @InjectMocks
    private RefundServiceImpl refundService;

    @Test
    void customerRequest_within7Days_isPendingReview() {
        UUID mappingId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", customerId);
        User pt = User.builder().build();
        ReflectionTestUtils.setField(pt, "id", UUID.randomUUID());
        PtClientMapping mapping = PtClientMapping.builder()
                .client(customer)
                .pt(pt)
                .status(ClientMappingStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(mapping, "createdAt", LocalDateTime.now().minusDays(3));
        ReflectionTestUtils.setField(mapping, "id", mappingId);

        when(mappingRepository.findByIdForUpdate(mappingId)).thenReturn(Optional.of(mapping));
        when(coachingWalletService.markEscrowDisputedIfPresent(mappingId)).thenReturn(true);
        when(refundRepository.save(any())).thenAnswer(inv -> {
            RefundRequest r = inv.getArgument(0);
            if (r.getId() == null) {
                ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            }
            return r;
        });

        RefundCreateRequest req = new RefundCreateRequest();
        req.setMappingId(mappingId);
        req.setReason(RefundReason.CUSTOMER_REQUEST);
        req.setNote("Not satisfied");

        RefundRequest saved = refundService.requestRefund(customerId, req);

        assertEquals(RefundStatus.PENDING_REVIEW, saved.getStatus());
    }

    @Test
    void approveReview_refundsEscrowAndDeactivatesMapping() {
        UUID mappingId = UUID.randomUUID();
        UUID refundId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", customerId);
        User pt = User.builder().build();
        ReflectionTestUtils.setField(pt, "id", UUID.randomUUID());
        PtClientMapping mapping = PtClientMapping.builder()
                .client(customer)
                .pt(pt)
                .status(ClientMappingStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(mapping, "id", mappingId);

        RefundRequest refund = RefundRequest.builder()
                .mappingId(mappingId)
                .customerId(customerId)
                .ptId(pt.getId())
                .reason(RefundReason.CUSTOMER_REQUEST)
                .status(RefundStatus.PENDING_REVIEW)
                .build();
        ReflectionTestUtils.setField(refund, "id", refundId);

        when(refundRepository.findByIdForUpdate(refundId)).thenReturn(Optional.of(refund));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(mappingRepository.findByIdForUpdate(mappingId)).thenReturn(Optional.of(mapping));
        when(coachingWalletService.refundEscrowIfPresent(mappingId)).thenReturn(true);
        when(mappingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RefundReviewRequest req = new RefundReviewRequest();
        req.setAction("APPROVE");

        refundService.review(refundId, req);

        ArgumentCaptor<PtClientMapping> captor = ArgumentCaptor.forClass(PtClientMapping.class);
        verify(mappingRepository).save(captor.capture());
        assertEquals(ClientMappingStatus.INACTIVE, captor.getValue().getStatus());
    }
}
