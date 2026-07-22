package com.sba.nutricanbe.payment.repository;

import com.sba.nutricanbe.payment.entity.Wallet;
import com.sba.nutricanbe.payment.enums.WalletType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {

    Optional<Wallet> findByOwnerIdAndWalletType(UUID ownerId, WalletType walletType);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.ownerId = :ownerId and w.walletType = :type")
    Optional<Wallet> findUserWalletForUpdate(
            @Param("ownerId") UUID ownerId, @Param("type") WalletType type);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.ownerId is null and w.walletType = :type")
    Optional<Wallet> findSystemWalletForUpdate(@Param("type") WalletType type);

    Optional<Wallet> findFirstByOwnerIdIsNullAndWalletType(WalletType type);
}
