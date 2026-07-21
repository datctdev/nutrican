package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PtAppointmentRepository extends JpaRepository<PtAppointment, UUID> {
    List<PtAppointment> findByPtIdAndStatusInOrderByStartTimeAsc(UUID ptId, List<AppointmentStatus> statuses);
    List<PtAppointment> findByClientIdAndStatusInOrderByStartTimeAsc(UUID clientId, List<AppointmentStatus> statuses);

    @Query("SELECT a FROM PtAppointment a WHERE a.ptId = :ptId AND a.status IN :statuses "
            + "AND a.startTime < :endTime AND a.endTime > :startTime")
    List<PtAppointment> findOverlapping(
            @Param("ptId") UUID ptId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("statuses") List<AppointmentStatus> statuses);

    List<PtAppointment> findByStatusAndCreatedAtBefore(AppointmentStatus status, LocalDateTime cutoff);

    boolean existsByMappingId(UUID mappingId);

    boolean existsByMappingIdAndStartTime(UUID mappingId, java.time.LocalDateTime startTime);

    long countByMappingId(UUID mappingId);
}
