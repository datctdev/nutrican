package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SosTicketRepository extends JpaRepository<SosTicket, UUID> {

    Page<SosTicket> findByStatus(SosTicketStatus status, Pageable pageable);

    Page<SosTicket> findByStatusIn(List<SosTicketStatus> statuses, Pageable pageable);

    @Query("SELECT t FROM SosTicket t LEFT JOIN FETCH t.dietLog dl WHERE dl.customerId = :customerId ORDER BY t.createdAt DESC")
    List<SosTicket> findByCustomerId(@Param("customerId") UUID customerId);

    @Query("SELECT t FROM SosTicket t LEFT JOIN FETCH t.dietLog dl WHERE t.ptId = :ptId ORDER BY t.createdAt DESC")
    Page<SosTicket> findByPt_Id(@Param("ptId") UUID ptId, Pageable pageable);

    @Query("SELECT t FROM SosTicket t LEFT JOIN FETCH t.dietLog dl WHERE t.ptId = :ptId AND t.status = :status")
    Page<SosTicket> findByPt_IdAndStatus(@Param("ptId") UUID ptId, @Param("status") SosTicketStatus status, Pageable pageable);

    List<SosTicket> findByDietLog_Id(UUID dietLogId);
}
