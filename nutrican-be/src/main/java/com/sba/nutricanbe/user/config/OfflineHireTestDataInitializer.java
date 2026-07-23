package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.entity.PtAvailabilityWindow;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtVenue;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtAvailabilityWindowRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtVenueRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;


@Slf4j
@Component
@Profile("dev")
@Order(3)
@RequiredArgsConstructor
public class OfflineHireTestDataInitializer implements CommandLineRunner {

    private static final String PASSWORD = "123456";

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtVenueRepository venueRepository;
    private final PtAvailabilityWindowRepository availabilityRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        User offlinePt = seedUser(
                "pt.offline@gmail.com",
                "Tran Van PT Offline",
                UserRole.PT_CERTIFIED,
                "0903000001",
                "TP. Ho Chi Minh");

        User offlineCustomer = seedUser(
                "customer3@gmail.com",
                "Le Thi Test Offline",
                UserRole.CUSTOMER,
                "0901000003",
                "88 Vo Van Tan, Q.3, TP.HCM");

        offlineCustomer.setHeightCm(168);
        offlineCustomer.setGender("FEMALE");
        offlineCustomer.setNutritionGoal(NutritionGoal.WEIGHT_LOSS);
        offlineCustomer.setOnboardingCompletedAt(LocalDateTime.now());
        offlineCustomer.setOnboardingStep(null);
        userRepository.save(offlineCustomer);

        PtProfile offlineProfile = seedOfflinePtProfile(offlinePt);
        seedVenuesAndAvailability(offlineProfile);

        ptProfileRepository.findByUserEmail("pt@nutrican.com").ifPresent(profile -> {
            if (venueRepository.countByPtProfile_IdAndActiveTrue(profile.getId()) == 0) {
                seedVenuesAndAvailability(profile);
                log.warn("Added offline venues/availability to pt@nutrican.com (BOTH mode demo)");
            }
        });

        log.warn("""
                
                ========== OFFLINE HIRE TEST DATA ==========
                Password for all accounts below: {}
                
                [PT offline only]
                  Email: pt.offline@gmail.com
                  Profile URL: /pt-profile/{}
                  Venues: California Fitness Q7, Elite Gym Thao Dien
                  Schedule: Mon-Fri 07-11 & 17-21, Sat 08-12 (60-min slots)
                  Price: 500,000 VND / SESSION_60
                
                [PT online + offline]
                  Email: pt@nutrican.com
                  Profile URL: /pt-profile/{}
                  (customer@nutrican.com already ACTIVE — use customer3 for hire test)
                
                [Customer — no open hire request]
                  Email: customer3@gmail.com
                
                Smoke test:
                  1. Login customer3 → Chợ PT → pt.offline profile
                  2. Hire OFFLINE → pick venue + chọn 2-3 buổi trên lịch tuần
                  3. Login pt.offline → Clients → Accept
                  4. Login customer3 → Pay VNPay → Coaching → Lịch hẹn (N appointments)
                =============================================
                """,
                PASSWORD,
                offlineProfile.getId(),
                ptProfileRepository.findByUserEmail("pt@nutrican.com")
                        .map(PtProfile::getId)
                        .orElse(null));
    }

    private User seedUser(String email, String fullName, UserRole role, String phone, String address) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    existing.setPasswordHash(passwordEncoder.encode(PASSWORD));
                    existing.setStatus(UserStatus.ACTIVE);
                    existing.setPasswordSetRequired(false);
                    existing.setIsKycVerified(true);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(PASSWORD))
                        .fullName(fullName)
                        .role(role)
                        .status(UserStatus.ACTIVE)
                        .phoneNumber(phone)
                        .address(address)
                        .dateOfBirth(LocalDate.of(1995, 4, 15))
                        .passwordSetRequired(false)
                        .isKycVerified(true)
                        .build()));
    }

    private PtProfile seedOfflinePtProfile(User pt) {
        return ptProfileRepository.findByUserId(pt.getId())
                .map(profile -> {
                    profile.setIsVerified(true);
                    profile.setVerificationStatus(UserStatus.ACTIVE);
                    profile.setPtRequestStatus(UserStatus.ACTIVE);
                    profile.setTrainingMode(TrainingMode.OFFLINE);
                    profile.setLocation("TP. Ho Chi Minh");
                    profile.setOfflineRate(BigDecimal.valueOf(500_000));
                    profile.setOfflineRateUnit("SESSION_60");
                    profile.setOnlineRate(null);
                    profile.setOnlineRateUnit(null);
                    profile.setBio("PT chuyên coaching offline tại gym/studio TP.HCM. "
                            + "Tài khoản seed để test luồng thuê offline (venue + buổi #1).");
                    profile.setPreferredGoals(List.of("WEIGHT_LOSS", "WEIGHT_GAIN"));
                    profile.setPreferredDietTypes(List.of("NORMAL", "VEGETARIAN"));
                    profile.setTier(Tier.TIER_1);
                    return ptProfileRepository.save(profile);
                })
                .orElseGet(() -> ptProfileRepository.save(PtProfile.builder()
                        .user(pt)
                        .isVerified(true)
                        .verificationStatus(UserStatus.ACTIVE)
                        .ptRequestStatus(UserStatus.ACTIVE)
                        .trainingMode(TrainingMode.OFFLINE)
                        .location("TP. Ho Chi Minh")
                        .offlineRate(BigDecimal.valueOf(500_000))
                        .offlineRateUnit("SESSION_60")
                        .bio("PT chuyên coaching offline tại gym/studio TP.HCM. "
                                + "Tài khoản seed để test luồng thuê offline (venue + buổi #1).")
                        .trainingPhilosophy("Tập đúng chỗ, đúng giờ — cam kết rõ ràng từ buổi đầu.")
                        .experienceStartDate(LocalDate.of(2018, 1, 1))
                        .specializations(List.of("Fat loss", "Strength", "Offline coaching"))
                        .preferredGoals(List.of("WEIGHT_LOSS", "WEIGHT_GAIN"))
                        .preferredDietTypes(List.of("NORMAL", "VEGETARIAN"))
                        .tier(Tier.TIER_1)
                        .rating(BigDecimal.ZERO)
                        .totalReviews(0)
                        .build()));
    }

    private void seedVenuesAndAvailability(PtProfile profile) {
        if (venueRepository.countByPtProfile_IdAndActiveTrue(profile.getId()) == 0) {
            venueRepository.save(PtVenue.builder()
                    .ptProfile(profile)
                    .name("California Fitness Quận 7")
                    .address("366 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP.HCM")
                    .mapsUrl("https://maps.google.com/?q=California+Fitness+Quan+7")
                    .note("Có locker, parking basement")
                    .active(true)
                    .build());
            venueRepository.save(PtVenue.builder()
                    .ptProfile(profile)
                    .name("Elite Gym Thảo Điền")
                    .address("40 Xuân Thủy, Thảo Điền, Quận 2, TP.HCM")
                    .mapsUrl("https://maps.google.com/?q=Elite+Gym+Thao+Dien")
                    .note("Studio nhỏ, phù hợp 1-1")
                    .active(true)
                    .build());
        }

        if (availabilityRepository.findByPtProfile_IdOrderByDayOfWeekAscStartTimeAsc(profile.getId()).isEmpty()) {
            for (int day = 1; day <= 5; day++) {
                availabilityRepository.save(PtAvailabilityWindow.builder()
                        .ptProfile(profile)
                        .dayOfWeek(day)
                        .startTime(LocalTime.of(7, 0))
                        .endTime(LocalTime.of(11, 0))
                        .slotMinutes(60)
                        .build());
                availabilityRepository.save(PtAvailabilityWindow.builder()
                        .ptProfile(profile)
                        .dayOfWeek(day)
                        .startTime(LocalTime.of(17, 0))
                        .endTime(LocalTime.of(21, 0))
                        .slotMinutes(60)
                        .build());
            }
            availabilityRepository.save(PtAvailabilityWindow.builder()
                    .ptProfile(profile)
                    .dayOfWeek(6)
                    .startTime(LocalTime.of(8, 0))
                    .endTime(LocalTime.of(12, 0))
                    .slotMinutes(60)
                    .build());
        }
    }
}
