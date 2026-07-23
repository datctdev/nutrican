package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.AppointmentResponse;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.service.AppointmentSlotHelper;
import com.sba.nutricanbe.user.service.OfflinePackageAppointmentService;
import com.sba.nutricanbe.user.service.impl.AppointmentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentValidationTest {

    @Mock private PtAppointmentRepository appointmentRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private PtMappingSessionRepository mappingSessionRepository;
    @Mock private CoachingWalletService walletService;
    @Mock private AppointmentSlotHelper appointmentSlotHelper;
    @Mock private PtProfileRepository ptProfileRepository;
    @Mock private OfflinePackageAppointmentService offlinePackageAppointmentService;

    private AppointmentServiceImpl appointmentService;

    @BeforeEach
    void setUp() {
        appointmentService = new AppointmentServiceImpl(
                appointmentRepository, mappingRepository, mappingSessionRepository, walletService,
                appointmentSlotHelper, ptProfileRepository, offlinePackageAppointmentService);
    }

    @Test
    void book_rejectsBecauseFreeBookingDisabled() {
        assertThrows(BadRequestException.class,
                () -> appointmentService.book(UUID.randomUUID(), UUID.randomUUID(), new BookAppointmentRequest()));
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

        AppointmentResponse result = appointmentService.cancelByCustomer(customerId, apptId, null);
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

        AppointmentResponse result = appointmentService.cancelByCustomer(customerId, apptId, null);
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
