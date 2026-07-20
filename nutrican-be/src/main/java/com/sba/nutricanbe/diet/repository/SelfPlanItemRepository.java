package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface SelfPlanItemRepository extends JpaRepository<SelfPlanItem, UUID> {
    List<SelfPlanItem> findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(UUID customerId, LocalDate planDate);

    List<SelfPlanItem> findBySubmissionId(UUID submissionId);
}
