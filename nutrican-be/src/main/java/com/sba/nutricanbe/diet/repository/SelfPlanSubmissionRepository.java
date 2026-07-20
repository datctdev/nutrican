package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SelfPlanSubmissionRepository extends JpaRepository<SelfPlanSubmission, UUID> {
    Optional<SelfPlanSubmission> findByCustomerIdAndPlanDateAndStatus(
            UUID customerId, LocalDate planDate, SelfPlanSubmissionStatus status);

    List<SelfPlanSubmission> findByPtIdAndStatusOrderBySubmittedAtDesc(UUID ptId, SelfPlanSubmissionStatus status);

    boolean existsByCustomerIdAndPlanDateAndStatus(
            UUID customerId, LocalDate planDate, SelfPlanSubmissionStatus status);

    List<SelfPlanSubmission> findByCustomerIdAndPlanDate(UUID customerId, LocalDate planDate);

    List<SelfPlanSubmission> findByCustomerIdAndStatusOrderBySubmittedAtDesc(
            UUID customerId, SelfPlanSubmissionStatus status);

    List<SelfPlanSubmission> findByCustomerIdOrderBySubmittedAtDesc(UUID customerId);

    List<SelfPlanSubmission> findByCustomerIdAndPtIdAndStatus(
            UUID customerId, UUID ptId, SelfPlanSubmissionStatus status);
}
