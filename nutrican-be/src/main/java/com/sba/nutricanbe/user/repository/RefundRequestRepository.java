package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, UUID> {
    List<RefundRequest> findByStatusOrderByCreatedAtDesc(RefundStatus status);
    List<RefundRequest> findAllByOrderByCreatedAtDesc();
}
