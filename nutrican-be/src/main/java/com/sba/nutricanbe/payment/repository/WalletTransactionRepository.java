package com.sba.nutricanbe.payment.repository;

import com.sba.nutricanbe.payment.entity.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    boolean existsByDedupeKey(String dedupeKey);

    @Query("""
            select t from WalletTransaction t
            where t.fromWallet.id = :walletId or t.toWallet.id = :walletId
            order by t.createdAt desc
            """)
    Page<WalletTransaction> findHistory(@Param("walletId") UUID walletId, Pageable pageable);
}
