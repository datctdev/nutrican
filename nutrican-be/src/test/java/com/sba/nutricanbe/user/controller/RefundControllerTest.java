package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.RefundReason;
import com.sba.nutricanbe.user.enums.RefundStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

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

    @InjectMocks
    private RefundController refundController;

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

        when(mappingRepository.findById(mappingId)).thenReturn(Optional.of(mapping));
        when(refundRepository.save(any())).thenAnswer(inv -> {
            RefundRequest r = inv.getArgument(0);
            if (r.getId() == null) {
                ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            }
            return r;
        });

        RefundController.RefundCreateRequest req = new RefundController.RefundCreateRequest();
        req.setMappingId(mappingId);
        req.setReason(RefundReason.CUSTOMER_REQUEST);
        req.setNote("Not satisfied");

        ResponseEntity<?> response = refundController.requestRefund(customer, req);
        RefundRequest saved = (RefundRequest) ((com.sba.nutricanbe.common.dto.ApiResponse<?>) response.getBody()).getData();

        assertEquals(RefundStatus.PENDING_REVIEW, saved.getStatus());
    }

    @Test
    void ptCancel_autoApprovesAndDeactivatesMapping() {
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
        ReflectionTestUtils.setField(mapping, "createdAt", LocalDateTime.now().minusDays(1));
        ReflectionTestUtils.setField(mapping, "id", mappingId);

        when(mappingRepository.findById(mappingId)).thenReturn(Optional.of(mapping));
        when(refundRepository.save(any())).thenAnswer(inv -> {
            RefundRequest r = inv.getArgument(0);
            if (r.getId() == null) {
                ReflectionTestUtils.setField(r, "id", UUID.randomUUID());
            }
            return r;
        });

        RefundController.RefundCreateRequest req = new RefundController.RefundCreateRequest();
        req.setMappingId(mappingId);
        req.setReason(RefundReason.PT_CANCEL);

        refundController.requestRefund(customer, req);

        ArgumentCaptor<PtClientMapping> captor = ArgumentCaptor.forClass(PtClientMapping.class);
        verify(mappingRepository).save(captor.capture());
        assertEquals(ClientMappingStatus.INACTIVE, captor.getValue().getStatus());
    }
}
