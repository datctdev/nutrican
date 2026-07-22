package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtConductReport;
import com.sba.nutricanbe.user.enums.PtConductReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PtConductReportRepository extends JpaRepository<PtConductReport, UUID> {

    List<PtConductReport> findByStatusOrderByCreatedAtDesc(PtConductReportStatus status);

    List<PtConductReport> findAllByOrderByCreatedAtDesc();

    boolean existsByMappingIdAndCustomerIdAndStatus(
            UUID mappingId, UUID customerId, PtConductReportStatus status);
}
