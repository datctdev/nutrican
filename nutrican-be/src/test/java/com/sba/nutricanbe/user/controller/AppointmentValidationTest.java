package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtAvailabilityWindowRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtSlotHoldRepository;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import com.sba.nutricanbe.user.service.AppointmentSlotHelper;
import com.sba.nutricanbe.user.service.impl.AppointmentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentValidationTest {

    @Mock private PtAppointmentRepository appointmentRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private RefundRequestRepository refundRepository;
    @Mock private PtAvailabilityWindowRepository availabilityRepository;
    @Mock private PtSlotHoldRepository slotHoldRepository;

    private AppointmentServiceImpl appointmentService;

    @BeforeEach
    void setUp() {
        AppointmentSlotHelper slotHelper = new AppointmentSlotHelper(
                appointmentRepository, availabilityRepository, slotHoldRepository);
        appointmentService = new AppointmentServiceImpl(
                appointmentRepository, mappingRepository, refundRepository, slotHelper);
    }

    @Test
    void book_rejectsSlotShorterThan30Minutes() {
        UUID ptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        PtClientMapping mapping = PtClientMapping.builder()
                .status(ClientMappingStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(mapping, "id", UUID.randomUUID());
        when(mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, customerId))
                .thenReturn(Optional.of(mapping));

        BookAppointmentRequest request = new BookAppointmentRequest();
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        request.setStartTime(start);
        request.setEndTime(start.plusMinutes(20));

        assertThrows(BadRequestException.class,
                () -> appointmentService.book(customerId, ptId, request));
    }

    @Test
    void book_rejectsOverlappingPtSlot() {
        UUID ptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        PtClientMapping mapping = PtClientMapping.builder()
                .status(ClientMappingStatus.ACTIVE)
                .build();
        when(mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, customerId))
                .thenReturn(Optional.of(mapping));

        LocalDateTime start = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        LocalDateTime end = start.plusMinutes(60);
        BookAppointmentRequest request = new BookAppointmentRequest();
        request.setStartTime(start);
        request.setEndTime(end);

        PtAppointment existing = PtAppointment.builder().build();
        ReflectionTestUtils.setField(existing, "id", UUID.randomUUID());
        when(appointmentRepository.findOverlapping(
                eq(ptId), eq(start), eq(end),
                eq(List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED))))
                .thenReturn(List.of(existing));

        assertThrows(BadRequestException.class,
                () -> appointmentService.book(customerId, ptId, request));
    }

    @Test
    void cancelByCustomer_noFeeWhen48HoursOrMore() {
        UUID apptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        PtAppointment appt = PtAppointment.builder()
                .clientId(customerId)
                .status(AppointmentStatus.CONFIRMED)
                .startTime(LocalDateTime.now().plusDays(3))
                .build();
        ReflectionTestUtils.setField(appt, "id", apptId);
        when(appointmentRepository.findById(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PtAppointment result = appointmentService.cancelByCustomer(customerId, apptId, null);
        assertEquals(AppointmentCancelType.NO_FEE, result.getCancelType());
        assertEquals(AppointmentStatus.CANCELLED, result.getStatus());
    }

    @Test
    void cancelByCustomer_lateWhenUnder48Hours() {
        UUID apptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        PtAppointment appt = PtAppointment.builder()
                .clientId(customerId)
                .status(AppointmentStatus.PENDING)
                .startTime(LocalDateTime.now().plusHours(12))
                .build();
        ReflectionTestUtils.setField(appt, "id", apptId);
        when(appointmentRepository.findById(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PtAppointment result = appointmentService.cancelByCustomer(customerId, apptId, null);
        assertEquals(AppointmentCancelType.LATE, result.getCancelType());
    }

    @Test
    void cancelByCustomer_rejectsPastAppointment() {
        UUID apptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        PtAppointment appt = PtAppointment.builder()
                .clientId(customerId)
                .status(AppointmentStatus.CONFIRMED)
                .startTime(LocalDateTime.now().minusHours(1))
                .build();
        when(appointmentRepository.findById(apptId)).thenReturn(Optional.of(appt));

        assertThrows(BadRequestException.class,
                () -> appointmentService.cancelByCustomer(customerId, apptId, null));
    }
}
