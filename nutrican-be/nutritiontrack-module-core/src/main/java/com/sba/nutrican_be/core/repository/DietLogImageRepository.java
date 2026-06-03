package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.DietLogImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DietLogImageRepository extends JpaRepository<DietLogImage, UUID> {

    List<DietLogImage> findByDietLogIdOrderBySortOrderAsc(UUID dietLogId);

    void deleteByDietLogId(UUID dietLogId);

    int countByDietLogId(UUID dietLogId);
}
