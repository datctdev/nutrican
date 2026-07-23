package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.AppointmentActionRequest;
import com.sba.nutricanbe.user.dto.AppointmentResponse;
import com.sba.nutricanbe.user.dto.AddMappingSessionRequest;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.dto.CancelAppointmentRequest;
import com.sba.nutricanbe.user.dto.RescheduleAppointmentRequest;
import com.sba.nutricanbe.user.entity.PtAppointment;

import java.util.List;
import java.util.UUID;

public interface AppointmentService {

    PtAppointment book(UUID customerId, UUID ptId, BookAppointmentRequest request);

    List<PtAppointment> upcomingForCustomer(UUID customerId);

    List<PtAppointment> upcomingForPt(UUID ptId);

    AppointmentResponse updateByPt(UUID ptId, UUID appointmentId, AppointmentActionRequest request);

    AppointmentResponse cancelByCustomer(UUID customerId, UUID appointmentId, CancelAppointmentRequest request);

    AppointmentResponse rescheduleByPt(UUID ptId, UUID appointmentId, RescheduleAppointmentRequest request);

    AppointmentResponse addSessionByPt(UUID ptId, UUID mappingId, AddMappingSessionRequest request);
}
