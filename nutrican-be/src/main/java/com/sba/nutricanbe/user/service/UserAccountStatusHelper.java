package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Shared suspend / lift-if-expired helpers for auth and JWT.
 */
@Component
@RequiredArgsConstructor
public class UserAccountStatusHelper {

    private static final DateTimeFormatter VN_DT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final UserRepository userRepository;

    /**
     * If SUSPENDED and suspendedUntil has passed, lift to ACTIVE.
     * @return true if user may authenticate (not suspended / inactive)
     */
    @Transactional
    public boolean ensureActiveOrLiftExpired(User user) {
        if (user == null) return false;
        if (user.getStatus() == UserStatus.INACTIVE) return false;
        if (user.getStatus() != UserStatus.SUSPENDED) return true;

        LocalDateTime until = user.getSuspendedUntil();
        if (until != null && !DietDates.nowVn().isBefore(until)) {
            user.setStatus(UserStatus.ACTIVE);
            user.setSuspendedUntil(null);
            userRepository.save(user);
            return true;
        }
        return false;
    }

    /** Throws if still suspended after attempting lift. */
    @Transactional
    public void assertNotSuspendedOrThrow(User user) {
        if (ensureActiveOrLiftExpired(user)) return;
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new BadRequestException(suspendedMessage(user));
        }
    }

    public static String suspendedMessage(User user) {
        if (user.getSuspendedUntil() != null) {
            return "Tài khoản bị khóa đến " + user.getSuspendedUntil().format(VN_DT);
        }
        return "Tài khoản bị khóa";
    }

    @Transactional
    public void suspendUser(User user, Integer days) {
        user.setStatus(UserStatus.SUSPENDED);
        if (days != null && days > 0) {
            user.setSuspendedUntil(DietDates.nowVn().plusDays(days));
        } else {
            user.setSuspendedUntil(null);
        }
        userRepository.save(user);
    }

    @Transactional
    public void unsuspendUser(User user) {
        user.setStatus(UserStatus.ACTIVE);
        user.setSuspendedUntil(null);
        userRepository.save(user);
    }

    public static boolean isCurrentlySuspended(User user) {
        if (user == null || user.getStatus() != UserStatus.SUSPENDED) return false;
        LocalDateTime until = user.getSuspendedUntil();
        if (until != null && !DietDates.nowVn().isBefore(until)) return false;
        return true;
    }
}
