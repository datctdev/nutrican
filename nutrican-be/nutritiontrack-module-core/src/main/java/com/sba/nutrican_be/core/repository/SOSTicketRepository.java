package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SOSTicketRepository extends JpaRepository<SOSTicket, UUID> {

    Page<SOSTicket> findByStatus(SOSTicketStatus status, Pageable pageable);

    Page<SOSTicket> findByStatusIn(List<SOSTicketStatus> statuses, Pageable pageable);

    @Query("SELECT t FROM SOSTicket t LEFT JOIN FETCH t.dietLog dl LEFT JOIN FETCH dl.customer LEFT JOIN FETCH t.pt WHERE dl.customer.id = :customerId ORDER BY t.createdAt DESC")
    List<SOSTicket> findByCustomerId(@Param("customerId") UUID customerId);

    @Query("SELECT t FROM SOSTicket t LEFT JOIN FETCH t.dietLog dl LEFT JOIN FETCH dl.customer LEFT JOIN FETCH t.pt WHERE t.pt.id = :ptId ORDER BY t.createdAt DESC")
    Page<SOSTicket> findByPt_Id(@Param("ptId") UUID ptId, Pageable pageable);

    @Query("SELECT t FROM SOSTicket t LEFT JOIN FETCH t.dietLog dl LEFT JOIN FETCH dl.customer LEFT JOIN FETCH t.pt WHERE t.pt.id = :ptId AND t.status = :status")
    Page<SOSTicket> findByPt_IdAndStatus(@Param("ptId") UUID ptId, @Param("status") SOSTicketStatus status, Pageable pageable);

    List<SOSTicket> findByDietLog_Id(UUID dietLogId);
}
