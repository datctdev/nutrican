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

@Repository
public interface PtClientMappingRepository extends JpaRepository<PtClientMapping, Long> {

    Page<PtClientMapping> findByPt_Id(Long ptId, Pageable pageable);

    Page<PtClientMapping> findByPt_IdAndStatus(Long ptId, ClientMappingStatus status, Pageable pageable);

    Page<PtClientMapping> findByClient_Id(Long clientId, Pageable pageable);

    Optional<PtClientMapping> findByPt_IdAndClient_Id(Long ptId, Long clientId);

    boolean existsByPt_IdAndClient_Id(Long ptId, Long clientId);

    @Query("SELECT m FROM PtClientMapping m JOIN FETCH m.client WHERE m.pt.id = :ptId")
    List<PtClientMapping> findByPtIdWithClients(@Param("ptId") Long ptId);

    @Query("SELECT m FROM PtClientMapping m WHERE m.pt.id = :ptId AND m.status = :status")
    Page<PtClientMapping> findByPtIdAndStatusWithPagination(
            @Param("ptId") Long ptId, @Param("status") ClientMappingStatus status, Pageable pageable);
}
