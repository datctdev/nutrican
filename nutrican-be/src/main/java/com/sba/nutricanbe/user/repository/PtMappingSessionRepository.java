package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PtMappingSessionRepository extends JpaRepository<PtMappingSession, UUID> {

    List<PtMappingSession> findByMappingIdOrderBySequenceAsc(UUID mappingId);

    void deleteByMappingId(UUID mappingId);

    long countByMappingId(UUID mappingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from PtMappingSession s where s.id = :id")
    Optional<PtMappingSession> findByIdForUpdate(@Param("id") UUID id);

    List<PtMappingSession> findByStatusAndConfirmDeadlineAtBefore(
            MappingSessionStatus status, LocalDateTime deadline);

    long countByMappingIdAndStatusIn(UUID mappingId, List<MappingSessionStatus> statuses);

    List<PtMappingSession> findByMappingIdAndStatusIn(UUID mappingId, List<MappingSessionStatus> statuses);
}
