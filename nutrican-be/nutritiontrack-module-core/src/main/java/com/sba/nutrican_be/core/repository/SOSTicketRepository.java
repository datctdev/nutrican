package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SOSTicketRepository extends JpaRepository<SOSTicket, Long> {

    Page<SOSTicket> findByStatus(SOSTicketStatus status, Pageable pageable);

    Page<SOSTicket> findByPtId(Long ptId, Pageable pageable);

    List<SOSTicket> findByPtIdAndStatus(Long ptId, SOSTicketStatus status);

    Page<SOSTicket> findByStatusIn(List<SOSTicketStatus> statuses, Pageable pageable);
}
