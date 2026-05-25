package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Page<Review> findByPtId(UUID ptId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.pt.id = :ptId")
    Double findAverageRatingByPtId(@Param("ptId") UUID ptId);

    long countByPtId(UUID ptId);

    List<Review> findByReviewerId(UUID reviewerId);
}
