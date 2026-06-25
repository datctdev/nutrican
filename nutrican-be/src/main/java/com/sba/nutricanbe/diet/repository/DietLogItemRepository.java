package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.DietLogItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DietLogItemRepository extends JpaRepository<DietLogItem, UUID> {

    List<DietLogItem> findByDietLogIdOrderByCreatedAtAsc(UUID dietLogId);

    void deleteByDietLogId(UUID dietLogId);
}
