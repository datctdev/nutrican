package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.RefundRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
    private AppointmentController appointmentController;

    @Test
    void book_rejectsSlotShorterThan30Minutes() {
        UUID ptId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());
        PtClientMapping mapping = PtClientMapping.builder()
                .status(ClientMappingStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(mapping, "id", UUID.randomUUID());
        when(mappingRepository.findByPt_IdAndClient_Id(ptId, customer.getId()))
                .thenReturn(Optional.of(mapping));

        AppointmentController.AppointmentRequest request = new AppointmentController.AppointmentRequest();
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        request.setStartTime(start);
        request.setEndTime(start.plusMinutes(20));

        assertThrows(BadRequestException.class,
                () -> appointmentController.book(customer, ptId, request));
    }

    @Test
    void book_rejectsOverlappingPtSlot() {
        UUID ptId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());
        PtClientMapping mapping = PtClientMapping.builder()
                .status(ClientMappingStatus.ACTIVE)
                .build();
        when(mappingRepository.findByPt_IdAndClient_Id(ptId, customer.getId()))
                .thenReturn(Optional.of(mapping));

        LocalDateTime start = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        LocalDateTime end = start.plusMinutes(60);
        AppointmentController.AppointmentRequest request = new AppointmentController.AppointmentRequest();
        request.setStartTime(start);
        request.setEndTime(end);

        PtAppointment existing = PtAppointment.builder().build();
        ReflectionTestUtils.setField(existing, "id", UUID.randomUUID());
        when(appointmentRepository.findOverlapping(
                eq(ptId), eq(start), eq(end),
                eq(List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED))))
                .thenReturn(List.of(existing));

        assertThrows(BadRequestException.class,
                () -> appointmentController.book(customer, ptId, request));
    }

    @Test
    void cancelByCustomer_noFeeWhen48HoursOrMore() {
        UUID apptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", customerId);

        PtAppointment appt = PtAppointment.builder()
                .clientId(customerId)
                .status(AppointmentStatus.CONFIRMED)
                .startTime(LocalDateTime.now().plusDays(3))
                .build();
        ReflectionTestUtils.setField(appt, "id", apptId);
        when(appointmentRepository.findById(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = appointmentController.cancelByCustomer(customer, apptId, null);
        assertEquals(AppointmentCancelType.NO_FEE, response.getBody().getData().getCancelType());
        assertEquals(AppointmentStatus.CANCELLED, response.getBody().getData().getStatus());
    }

    @Test
    void cancelByCustomer_lateWhenUnder48Hours() {
        UUID apptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", customerId);

        PtAppointment appt = PtAppointment.builder()
                .clientId(customerId)
                .status(AppointmentStatus.PENDING)
                .startTime(LocalDateTime.now().plusHours(12))
                .build();
        ReflectionTestUtils.setField(appt, "id", apptId);
        when(appointmentRepository.findById(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var response = appointmentController.cancelByCustomer(customer, apptId, null);
        assertEquals(AppointmentCancelType.LATE, response.getBody().getData().getCancelType());
    }

    @Test
    void cancelByCustomer_rejectsPastAppointment() {
        UUID apptId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        User customer = User.builder().build();
        ReflectionTestUtils.setField(customer, "id", customerId);

        PtAppointment appt = PtAppointment.builder()
                .clientId(customerId)
                .status(AppointmentStatus.CONFIRMED)
                .startTime(LocalDateTime.now().minusHours(1))
                .build();
        when(appointmentRepository.findById(apptId)).thenReturn(Optional.of(appt));

        assertThrows(BadRequestException.class,
                () -> appointmentController.cancelByCustomer(customer, apptId, null));
    }
}
