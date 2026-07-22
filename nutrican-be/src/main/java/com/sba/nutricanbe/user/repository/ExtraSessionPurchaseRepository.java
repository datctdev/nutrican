package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.ExtraSessionPurchase;
import com.sba.nutricanbe.user.enums.ExtraSessionPurchaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExtraSessionPurchaseRepository extends JpaRepository<ExtraSessionPurchase, UUID> {

    Optional<ExtraSessionPurchase> findByPaymentId(UUID paymentId);

    List<ExtraSessionPurchase> findByMappingIdAndStatus(UUID mappingId, ExtraSessionPurchaseStatus status);
}
