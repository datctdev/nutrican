package com.sba.nutricanbe.payment.repository;

import com.sba.nutricanbe.payment.entity.WalletTransaction;
import com.sba.nutricanbe.payment.enums.WalletTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public interface WalletTransactionRepository
        extends JpaRepository<WalletTransaction, UUID>, JpaSpecificationExecutor<WalletTransaction> {

    boolean existsByDedupeKey(String dedupeKey);

    @Query("""
            select t from WalletTransaction t
            where t.fromWallet.id = :walletId or t.toWallet.id = :walletId
            order by t.createdAt desc
            """)
    Page<WalletTransaction> findHistory(@Param("walletId") UUID walletId, Pageable pageable);

    @Query("""
            select coalesce(sum(t.amount), 0) from WalletTransaction t
            where t.type = :type
              and t.status = com.sba.nutricanbe.payment.enums.WalletTransactionStatus.SUCCESS
            """)
    BigDecimal sumSuccessByType(@Param("type") WalletTransactionType type);

    @Query("""
            select coalesce(sum(t.amount), 0) from WalletTransaction t
            where t.type = :type
              and t.status = com.sba.nutricanbe.payment.enums.WalletTransactionStatus.SUCCESS
              and t.createdAt >= :from
              and t.createdAt <= :to
            """)
    BigDecimal sumSuccessByTypeBetween(
            @Param("type") WalletTransactionType type,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    static Specification<WalletTransaction> adminLedgerSpec(
            WalletTransactionType type, LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (query != null) {
                query.orderBy(cb.desc(root.get("createdAt")));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    default BigDecimal sumSuccessByTypeInRange(
            WalletTransactionType type, LocalDateTime from, LocalDateTime to) {
        if (from != null && to != null) {
            return sumSuccessByTypeBetween(type, from, to);
        }
        if (from == null && to == null) {
            return sumSuccessByType(type);
        }
        // one-sided range via Specification aggregate is heavier; clamp the missing bound
        LocalDateTime effectiveFrom = from != null ? from : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime effectiveTo = to != null ? to : LocalDateTime.of(2999, 12, 31, 23, 59, 59);
        return sumSuccessByTypeBetween(type, effectiveFrom, effectiveTo);
    }
}
