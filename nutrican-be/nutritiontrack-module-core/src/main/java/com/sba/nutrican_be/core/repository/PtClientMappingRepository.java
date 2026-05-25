package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.PtClientMapping;
import com.sba.nutrican_be.core.enums.ClientMappingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PtClientMappingRepository extends JpaRepository<PtClientMapping, UUID> {

    Page<PtClientMapping> findByPt_Id(UUID ptId, Pageable pageable);

    Page<PtClientMapping> findByPt_IdAndStatus(UUID ptId, ClientMappingStatus status, Pageable pageable);

    Page<PtClientMapping> findByClient_Id(UUID clientId, Pageable pageable);

    Optional<PtClientMapping> findByPt_IdAndClient_Id(UUID ptId, UUID clientId);

    boolean existsByPt_IdAndClient_Id(UUID ptId, UUID clientId);

    @Query("SELECT m FROM PtClientMapping m JOIN FETCH m.client WHERE m.pt.id = :ptId")
    List<PtClientMapping> findByPtIdWithClients(@Param("ptId") UUID ptId);

    @Query("SELECT m FROM PtClientMapping m WHERE m.pt.id = :ptId AND m.status = :status")
    Page<PtClientMapping> findByPtIdAndStatusWithPagination(
            @Param("ptId") UUID ptId, @Param("status") ClientMappingStatus status, Pageable pageable);
}
