package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PtClientMappingRepository extends JpaRepository<PtClientMapping, UUID> {

    Page<PtClientMapping> findByPt_Id(UUID ptId, Pageable pageable);

    Page<PtClientMapping> findByPt_IdAndStatus(UUID ptId, ClientMappingStatus status, Pageable pageable);

    Page<PtClientMapping> findByPt_IdAndStatusIn(UUID ptId, List<ClientMappingStatus> statuses, Pageable pageable);

    List<PtClientMapping> findAllByPt_IdAndStatusIn(UUID ptId, List<ClientMappingStatus> statuses);

    Page<PtClientMapping> findByClient_Id(UUID clientId, Pageable pageable);

    Optional<PtClientMapping> findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(
            UUID ptId, UUID clientId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PtClientMapping> findTopByPt_IdAndClient_IdOrderByCreatedAtDesc(
            UUID ptId, UUID clientId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT m FROM PtClientMapping m
            JOIN FETCH m.pt
            JOIN FETCH m.client
            WHERE m.id = :mappingId
            """)
    Optional<PtClientMapping> findByIdForUpdate(@Param("mappingId") UUID mappingId);

    boolean existsByPt_IdAndClient_Id(UUID ptId, UUID clientId);

    boolean existsByPt_IdAndClient_IdAndStatus(UUID ptId, UUID clientId, ClientMappingStatus status);

    @Query("""
            SELECT m FROM PtClientMapping m
            JOIN FETCH m.pt
            JOIN FETCH m.client
            WHERE m.id = :mappingId
            """)
    Optional<PtClientMapping> findByIdWithUsers(@Param("mappingId") UUID mappingId);

    @Query("""
            SELECT m FROM PtClientMapping m
            JOIN FETCH m.pt
            JOIN FETCH m.client
            WHERE m.status = :status
              AND ((m.pt.id = :firstUserId AND m.client.id = :secondUserId)
                OR (m.pt.id = :secondUserId AND m.client.id = :firstUserId))
            """)
    Optional<PtClientMapping> findBetweenUsersByStatus(
            @Param("firstUserId") UUID firstUserId,
            @Param("secondUserId") UUID secondUserId,
            @Param("status") ClientMappingStatus status);

    @Query("""
            SELECT m FROM PtClientMapping m
            JOIN FETCH m.pt
            JOIN FETCH m.client
            WHERE m.pt.id = :userId OR m.client.id = :userId
            """)
    List<PtClientMapping> findThreadsByUserId(@Param("userId") UUID userId);

    @Query("SELECT m FROM PtClientMapping m JOIN FETCH m.client WHERE m.pt.id = :ptId")
    List<PtClientMapping> findByPtIdWithClients(@Param("ptId") UUID ptId);

    @Query("SELECT m FROM PtClientMapping m WHERE m.pt.id = :ptId AND m.status = :status")
    Page<PtClientMapping> findByPtIdAndStatusWithPagination(
            @Param("ptId") UUID ptId, @Param("status") ClientMappingStatus status, Pageable pageable);

    Optional<PtClientMapping> findFirstByClient_IdAndStatus(UUID clientId, ClientMappingStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PtClientMapping> findTopByClient_IdAndStatusOrderByCreatedAtDesc(
            UUID clientId, ClientMappingStatus status);

    boolean existsByClient_IdAndStatus(UUID clientId, ClientMappingStatus status);

    long countByPt_IdAndStatus(UUID ptId, ClientMappingStatus status);

    long countByPt_IdAndStatusIn(UUID ptId, List<ClientMappingStatus> statuses);

    Optional<PtClientMapping> findFirstByClient_IdAndStatusIn(
            UUID clientId, List<ClientMappingStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<PtClientMapping> findByStatusAndPaymentDueAtBefore(
            ClientMappingStatus status, java.time.LocalDateTime paymentDueAt);

    List<PtClientMapping> findByClient_IdAndStatusOrderByCompletedAtDesc(UUID clientId, ClientMappingStatus status);

    List<PtClientMapping> findBySelectedTrainingModeAndStatusAndPeriodEndsAtBefore(
            TrainingMode selectedTrainingMode,
            ClientMappingStatus status,
            LocalDateTime periodEndsAt);
}
