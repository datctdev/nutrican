package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.ClientGoalMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClientGoalMilestoneRepository extends JpaRepository<ClientGoalMilestone, UUID> {
    List<ClientGoalMilestone> findByUserIdOrderByAchievedAtDesc(UUID userId);
    boolean existsByUserIdAndTitle(UUID userId, String title);
}
