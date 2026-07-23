package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.enums.RequestStatus;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.common.service.impl.SystemSettingServiceImpl;
import com.sba.nutricanbe.user.dto.CertificationData;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtUpdateRequest;
import com.sba.nutricanbe.user.entity.Review;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.Gender;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtUpdateRequestRepository;
import com.sba.nutricanbe.user.repository.ReviewRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;


@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class UserInitializer implements CommandLineRunner {

    private static final String PASSWORD = "123456";

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final PtUpdateRequestRepository ptUpdateRequestRepository;
    private final ReviewRepository reviewRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        ensureRequireKycSetting();
        ensurePlatformFeeRateSetting();
        seedDemoAccounts();
        seedBackgroundAccounts();
        List<User> reviewers = seedReviewerCustomers();
        seedMarketplaceReviewsForKnownPts(reviewers);
        resyncAllPtRatingsFromReviews();
    }

    private void seedDemoAccounts() {
        seedUser("admin@nutrican.com", "Quản trị viên Nutrican", UserRole.ADMIN,
                "0900000000", "Nutrican HQ, TP.HCM", LocalDate.of(1990, 1, 1));

        User mainPt = seedUser("pt@nutrican.com", "Coach Nutrican", UserRole.PT_CERTIFIED,
                "0902000000", "Fitness Hub, Quận 7, TP.HCM", LocalDate.of(1992, 5, 6));
        seedFullPtProfile(mainPt,
                "PT chính của Nutrican — hơn 5 năm kinh nghiệm huấn luyện cá nhân và tư vấn dinh dưỡng. "
                        + "Đồng hành cùng bạn từ những thói quen nhỏ nhất tới mục tiêu vóc dáng bền vững.",
                "Kỷ luật là cầu nối giữa mục tiêu và thành tựu.",
                LocalDate.of(2016, 3, 1), Gender.MALE, "0902000000", TrainingMode.BOTH,
                "TP. Hồ Chí Minh", BigDecimal.valueOf(1200000), "MONTH",
                BigDecimal.valueOf(450000), "SESSION_60",
                List.of("Giảm cân", "Tăng cơ", "Thể hình"),
                List.of("WEIGHT_LOSS", "MUSCLE_GAIN"),
                List.of("NORMAL", "EAT_CLEAN"),
                List.of(
                        CertificationData.builder().name("NASM Certified Personal Trainer").issuingOrganization("NASM").issueDate("2018-05").neverExpires(false).expiryDate("2028-05").certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=NASM+Certificate").build(),
                        CertificationData.builder().name("Nutrition Specialist").issuingOrganization("Precision Nutrition").issueDate("2019-08").neverExpires(true).certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=Nutrition+Certificate").build()
                ));

        User demoCustomer = seedUser("customer@nutrican.com", "Khách Hàng Demo", UserRole.CUSTOMER,
                "0901000000", "12 Nguyễn Trãi, Quận 1, TP.HCM", LocalDate.of(2000, 8, 20));
        User demoSolo = seedUser("solo@nutrican.com", "Khách Hàng Solo (Không PT)", UserRole.CUSTOMER,
                "0911000000", "Solo Demo, TP.HCM", LocalDate.of(1998, 5, 15));

        seedCustomerE2eProfile(demoCustomer, NutritionGoal.MAINTAIN, 165, "FEMALE");
        seedCustomerE2eProfile(demoSolo, NutritionGoal.WEIGHT_LOSS, 172, "MALE");
        seedDemoMacroIfAbsent(demoCustomer, ActivityLevel.LIGHT, 1850, 105, 200, 60);
        seedDemoMacroIfAbsent(demoSolo, ActivityLevel.MODERATE, 2100, 130, 230, 70);

        seedMapping(mainPt, demoCustomer, ClientMappingStatus.ACTIVE);

        log.info("Seeded DEMO accounts (pwd {}): admin@, pt@, customer@ (có PT), solo@ (không PT)", PASSWORD);
    }

    private void seedBackgroundAccounts() {
        User certifiedPt = seedUser(
                "pt.certified@gmail.com", "Le Minh PT Certified", UserRole.PT_CERTIFIED,
                "0902000001", "Fitness Hub, Quan 7, TP.HCM", LocalDate.of(1992, 5, 6));
        seedFullPtProfile(certifiedPt,
                "Chào bạn, mình là PT chuyên nghiệp với hơn 5 năm kinh nghiệm. Mình tin rằng mọi sự thay đổi đều bắt đầu từ thói quen nhỏ nhất. Việc kết hợp giữa dinh dưỡng khoa học và tập luyện bài bản sẽ mang lại kết quả bền vững.",
                "Kỷ luật là cầu nối giữa mục tiêu và thành tựu. Tập luyện không chỉ thay đổi cơ thể mà còn rèn giũa ý chí.",
                LocalDate.of(2016, 3, 1), Gender.MALE, "0902000001", TrainingMode.BOTH,
                "TP. Hồ Chí Minh", BigDecimal.valueOf(1200000), "MONTH",
                BigDecimal.valueOf(450000), "SESSION_60",
                List.of("Giảm cân", "Tăng cơ", "Thể hình"),
                List.of("WEIGHT_LOSS", "MUSCLE_GAIN"),
                List.of("NORMAL", "EAT_CLEAN"),
                List.of(
                        CertificationData.builder().name("NASM Certified Personal Trainer").issuingOrganization("NASM").issueDate("2018-05").neverExpires(false).expiryDate("2028-05").certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=NASM+Certificate").build(),
                        CertificationData.builder().name("Nutrition Specialist").issuingOrganization("Precision Nutrition").issueDate("2019-08").neverExpires(true).certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=Nutrition+Certificate").build()
                ));

        User freelancePt = seedUser(
                "pt.freelance@gmail.com", "Pham Anh PT Freelance", UserRole.PT_FREELANCE,
                "0902000002", "Online Coaching, TP.HCM", LocalDate.of(1990, 11, 18));
        seedFullPtProfile(freelancePt,
                "Freelance PT chuyên hướng dẫn lịch tập tại nhà và chế độ ăn dành cho người bận rộn. Phương pháp của mình tập trung vào tính thực tế, linh hoạt nhưng vẫn đảm bảo hiệu quả.",
                "Tập luyện phải là niềm vui, không phải là gánh nặng. Chậm mà chắc luôn tốt hơn nhanh mà bỏ cuộc.",
                LocalDate.of(2019, 6, 1), Gender.FEMALE, "0902000002", TrainingMode.ONLINE,
                "Hà Nội", BigDecimal.valueOf(1500000), "MONTH", null, null,
                List.of("Yoga", "Pilates", "Giảm cân"),
                List.of("WEIGHT_LOSS", "MAINTAIN"),
                List.of("VEGAN", "KETO"),
                List.of(
                        CertificationData.builder().name("200H Yoga Teacher Training").issuingOrganization("Yoga Alliance").issueDate("2020-01").neverExpires(true).certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=Yoga+Certificate").build()
                ));

        User customerOne = seedUser(
                "customer1@gmail.com", "Nguyen Van Customer", UserRole.CUSTOMER,
                "0901000001", "12 Nguyen Trai, Quan 1, TP.HCM", LocalDate.of(1998, 3, 12));
        User customerTwo = seedUser(
                "customer2@gmail.com", "Tran Thi Hoc Vien", UserRole.CUSTOMER,
                "0901000002", "45 Le Loi, Quan 3, TP.HCM", LocalDate.of(2000, 8, 20));
        User endReqHv = seedUser(
                "hv.endreq@nutrican.com", "HV End Request Demo", UserRole.CUSTOMER,
                "0903111999", "End Request Demo, TP.HCM", LocalDate.of(1997, 2, 14));

        seedCustomerE2eProfile(customerOne, NutritionGoal.WEIGHT_LOSS, 170, "MALE");
        seedCustomerE2eProfile(customerTwo, NutritionGoal.WEIGHT_LOSS, 165, "FEMALE");
        seedCustomerE2eProfile(endReqHv, NutritionGoal.MAINTAIN, 168, "FEMALE");
        seedMacroTarget(customerOne, 2000, 120, 220, 65);
        seedMacroTarget(customerTwo, 1900, 110, 200, 60);

        seedMapping(certifiedPt, customerOne, ClientMappingStatus.ACTIVE);
        seedMapping(freelancePt, customerTwo, ClientMappingStatus.PENDING);
        seedMapping(certifiedPt, endReqHv, ClientMappingStatus.END_REQUESTED);

        if (!ptUpdateRequestRepository.existsByPtIdAndStatus(certifiedPt.getId(), RequestStatus.PENDING)) {
            ptUpdateRequestRepository.save(PtUpdateRequest.builder()
                    .pt(certifiedPt)
                    .requestedData(Map.of(
                            "bio", "Bản cập nhật bio mới: Mình vừa thi đậu thêm chứng chỉ NASM cấp cao quốc tế.",
                            "trainingMode", "BOTH",
                            "contactPhone", "0988123456",
                            "hourlyRate", 500000,
                            "rateUnit", "SESSION_90"
                    ))
                    .reason("Tôi muốn cập nhật lại SĐT liên hệ mới và tăng nhẹ mức phí dịch vụ cho các buổi tập 90 phút.")
                    .status(RequestStatus.PENDING)
                    .build());
        }

        log.info("Seeded background accounts: {}, {}, {}, {}",
                customerOne.getEmail(), customerTwo.getEmail(),
                certifiedPt.getEmail(), freelancePt.getEmail());
    }

    private void ensureRequireKycSetting() {
        if (!systemSettingRepository.existsById("REQUIRE_KYC_FOR_PT")) {
            systemSettingRepository.save(SystemSetting.builder()
                    .key("REQUIRE_KYC_FOR_PT")
                    .value("false")
                    .build());
        }
    }

    private void ensurePlatformFeeRateSetting() {
        if (!systemSettingRepository.existsById(SystemSettingServiceImpl.PLATFORM_FEE_RATE)) {
            systemSettingRepository.save(SystemSetting.builder()
                    .key(SystemSettingServiceImpl.PLATFORM_FEE_RATE)
                    .value(SystemSettingServiceImpl.PLATFORM_FEE_RATE_DEFAULT)
                    .build());
            log.info("Seeded SYSTEM setting PLATFORM_FEE_RATE={}",
                    SystemSettingServiceImpl.PLATFORM_FEE_RATE_DEFAULT);
        }
    }

    private User seedUser(String email, String fullName, UserRole role, String phone, String address, LocalDate dateOfBirth) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    boolean changed = false;
                    existing.setPasswordHash(passwordEncoder.encode(PASSWORD));
                    changed = true;
                    if (existing.getRole() != role) {
                        existing.setRole(role);
                        changed = true;
                    }
                    if (existing.getStatus() != UserStatus.ACTIVE) {
                        existing.setStatus(UserStatus.ACTIVE);
                        changed = true;
                    }
                    if (!Boolean.FALSE.equals(existing.getPasswordSetRequired())) {
                        existing.setPasswordSetRequired(false);
                        changed = true;
                    }
                    return changed ? userRepository.save(existing) : existing;
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(PASSWORD))
                        .fullName(fullName)
                        .role(role)
                        .status(UserStatus.ACTIVE)
                        .phoneNumber(phone)
                        .address(address)
                        .dateOfBirth(dateOfBirth)
                        .passwordSetRequired(false)
                        .isKycVerified(true)
                        .build()));
    }

    private void seedFullPtProfile(User pt, String bio, String philosophy, LocalDate startDate,
                                   Gender gender, String contactPhone, TrainingMode trainingMode,
                                   String location, BigDecimal onlineRate, String onlineRateUnit,
                                   BigDecimal offlineRate, String offlineRateUnit,
                                   List<String> specializations, List<String> goals, List<String> diets,
                                   List<CertificationData> certs) {
        ptProfileRepository.findByUserId(pt.getId())
                .ifPresentOrElse(profile -> {
                    profile.setIsVerified(true);
                    profile.setVerificationStatus(UserStatus.ACTIVE);
                    profile.setPtRequestStatus(UserStatus.ACTIVE);
                    profile.setTrainingMode(trainingMode);
                    profile.setLocation(trainingMode == TrainingMode.ONLINE ? null : location);
                    profile.setOnlineRate(onlineRate);
                    profile.setOnlineRateUnit(onlineRateUnit);
                    profile.setOfflineRate(offlineRate);
                    profile.setOfflineRateUnit(offlineRateUnit);
                    ptProfileRepository.save(profile);
                }, () -> ptProfileRepository.save(PtProfile.builder()
                        .user(pt)
                        .isVerified(true)
                        .bio(bio)
                        .trainingPhilosophy(philosophy)
                        .experienceStartDate(startDate)
                        .gender(gender)
                        .contactPhone(contactPhone)
                        .trainingMode(trainingMode)
                        .location(trainingMode == TrainingMode.ONLINE ? null : location)
                        .onlineRate(onlineRate)
                        .onlineRateUnit(onlineRateUnit)
                        .offlineRate(offlineRate)
                        .offlineRateUnit(offlineRateUnit)
                        .specializations(specializations)
                        .preferredGoals(goals)
                        .preferredDietTypes(diets)
                        .certifications(certs)
                        .tier(Tier.TIER_1)
                        .rating(BigDecimal.ZERO)
                        .totalReviews(0)
                        .verificationStatus(UserStatus.ACTIVE)
                        .ptRequestStatus(UserStatus.ACTIVE)
                        .instagramUrl("https://instagram.com/pt.nutrican")
                        .linkedinUrl("https://linkedin.com/in/pt-nutrican")
                        .cvUrl("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
                        .portfolioShowcase(Map.of(
                                "coverPhotoUrl", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop",
                                "transformations", List.of(
                                        Map.of(
                                                "id", "1",
                                                "title", "Giảm 15kg mỡ thừa trong 3 tháng",
                                                "story", "Học viên đã kiên trì theo lịch tập tạ 4 buổi/tuần và chế độ ăn Low-Carb. Kết quả sau 12 tuần thực sự ngoài sức mong đợi.",
                                                "beforeUrl", "https://images.unsplash.com/photo-1603233720066-237cb1017838?q=80&w=600&auto=format&fit=crop",
                                                "afterUrl", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop"
                                        )
                                )
                        ))
                        .build()));
    }

    private void seedMapping(User pt, User customer, ClientMappingStatus status) {
        ptClientMappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), customer.getId())
                .ifPresentOrElse(mapping -> {
                    mapping.setStatus(status);
                    if (status == ClientMappingStatus.ACTIVE && mapping.getCoachingStartedAt() == null) {
                        mapping.setCoachingStartedAt(java.time.LocalDateTime.now().minusDays(14));
                    }
                    if (status == ClientMappingStatus.END_REQUESTED && mapping.getCoachingStartedAt() == null) {
                        mapping.setCoachingStartedAt(java.time.LocalDateTime.now().minusDays(30));
                    }
                    ptClientMappingRepository.save(mapping);
                }, () -> {
                    var builder = PtClientMapping.builder()
                            .pt(pt)
                            .client(customer)
                            .status(status);
                    if (status == ClientMappingStatus.ACTIVE) {
                        builder.coachingStartedAt(java.time.LocalDateTime.now().minusDays(14));
                    }
                    if (status == ClientMappingStatus.END_REQUESTED) {
                        builder.coachingStartedAt(java.time.LocalDateTime.now().minusDays(30));
                    }
                    ptClientMappingRepository.save(builder.build());
                });
    }

    private static final String[] REVIEWER_NAMES = {
            "Nguyễn Minh Hà", "Trần Quốc Bảo", "Lê Thị Mai", "Phạm Đức Anh",
            "Hoàng Thu Trang", "Vũ Nhật Nam", "Đặng Ngọc Lan", "Bùi Thành Đạt",
            "Đỗ Khánh Linh", "Ngô Văn Khoa", "Lý Mỹ Duyên", "Huỳnh Tấn Phát"
    };

    private static final String[] REVIEW_COMMENTS = {
            "PT tận tình, chế độ ăn sát thực tế. Sau 2 tháng mình đã có kết quả rõ rệt!",
            "Hướng dẫn rất chi tiết, lịch tập linh hoạt cho người đi làm.",
            "Mình thích cách PT chỉnh macro theo tuần — không bị ngán.",
            "Giao tiếp tốt, phản hồi nhật ký ăn nhanh trong ngày.",
            "Buổi offline đúng giờ, kỹ thuật squat được chỉnh rất kỹ.",
            "Giá hợp lý so với chất lượng. Sẽ giới thiệu bạn bè.",
            "Đôi khi phản hồi hơi chậm cuối tuần, nhưng overall ổn.",
            "Plan ăn dễ nấu, không đòi hỏi nguyên liệu đắt tiền.",
            "PT theo dõi cân nặng và nhắc nhở đúng lúc — rất có động lực.",
            "Chế độ tăng cơ ổn, mình lên +2kg nạc sau 6 tuần.",
            "Tư vấn dị ứng/đồ chay rất chu đáo.",
            "Đánh giá trung bình vì kỳ vọng cao hơn về video form check."
    };

    private static final double[] REVIEW_RATINGS = {
            5.0, 5.0, 4.5, 5.0, 4.0, 4.5, 3.5, 5.0, 4.5, 5.0, 4.0, 3.0
    };

    private List<User> seedReviewerCustomers() {
        List<User> reviewers = new java.util.ArrayList<>();
        for (int i = 0; i < REVIEWER_NAMES.length; i++) {
            String email = String.format("reviewer%02d@nutrican.com", i + 1);
            User u = seedUser(email, REVIEWER_NAMES[i], UserRole.CUSTOMER,
                    String.format("0905%06d", 100001 + i),
                    "Demo Reviewer, TP.HCM",
                    LocalDate.of(1995 + (i % 8), 1 + (i % 11), 5 + (i % 20)));
            seedCustomerE2eProfile(u, NutritionGoal.MAINTAIN, 165 + (i % 10), i % 2 == 0 ? "FEMALE" : "MALE");
            reviewers.add(u);
        }
        return reviewers;
    }

    private void seedMarketplaceReviewsForKnownPts(List<User> reviewers) {
        for (String email : List.of(
                "pt@nutrican.com",
                "pt.certified@gmail.com",
                "pt.freelance@gmail.com",
                "pt.offline@gmail.com")) {
            userRepository.findByEmail(email).ifPresent(pt -> seedPtReviewsBulk(pt, reviewers));
        }
    }

    private void seedPtReviewsBulk(User pt, List<User> reviewers) {
        String sampleImage = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop";
        int n = Math.min(10, reviewers.size());
        for (int i = 0; i < n; i++) {
            User reviewer = reviewers.get(i);
            if (reviewRepository.existsByPtIdAndReviewerId(pt.getId(), reviewer.getId())) {
                continue;
            }
            // Rotate ratings/comments per PT so averages differ slightly
            int idx = (i + Math.floorMod(pt.getEmail().hashCode(), REVIEW_COMMENTS.length))
                    % REVIEW_COMMENTS.length;
            reviewRepository.save(Review.builder()
                    .pt(pt)
                    .reviewer(reviewer)
                    .rating(REVIEW_RATINGS[idx])
                    .comment(REVIEW_COMMENTS[idx])
                    .isAnonymous(i % 4 == 0)
                    .imageUrl(i % 3 == 0 ? sampleImage : null)
                    .build());
        }
        syncPtRatingFromReviews(pt.getId());
    }

    private void syncPtRatingFromReviews(java.util.UUID ptId) {
        ptProfileRepository.findByUserId(ptId).ifPresent(profile -> {
            long count = reviewRepository.countByPtId(ptId);
            Double avg = reviewRepository.findAverageRatingByPtId(ptId);
            profile.setTotalReviews((int) count);
            profile.setRating(count == 0 || avg == null
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(avg).setScale(1, java.math.RoundingMode.HALF_UP));
            ptProfileRepository.save(profile);
        });
    }

    private void resyncAllPtRatingsFromReviews() {
        for (PtProfile profile : ptProfileRepository.findAll()) {
            syncPtRatingFromReviews(profile.getUser().getId());
        }
        log.info("Resynced PtProfile.rating/totalReviews from Review aggregates");
    }

    private void seedCustomerE2eProfile(User customer, NutritionGoal goal, int heightCm, String gender) {
        customer.setHeightCm(heightCm);
        customer.setGender(gender);
        customer.setNutritionGoal(goal);
        customer.setOnboardingCompletedAt(LocalDateTime.now());
        customer.setOnboardingStep(null);
        customer.setOnboardingSkippedAt(null);
        userRepository.save(customer);
    }

    private void seedMacroTarget(User customer, int calories, int protein, int carb, int fat) {
        if (macroTargetRepository.findByUserId(customer.getId()).isPresent()) {
            return;
        }
        macroTargetRepository.save(MacroTarget.builder()
                .user(customer)
                .dailyCalories(BigDecimal.valueOf(calories))
                .protein(BigDecimal.valueOf(protein))
                .carb(BigDecimal.valueOf(carb))
                .fat(BigDecimal.valueOf(fat))
                .build());
    }

    private void seedDemoMacroIfAbsent(User user, ActivityLevel activityLevel,
                                       int calories, int protein, int carb, int fat) {
        if (macroTargetRepository.findByUserId(user.getId()).isPresent()) {
            return;
        }
        user.setActivityLevel(activityLevel);
        userRepository.save(user);
        macroTargetRepository.save(MacroTarget.builder()
                .user(user)
                .dailyCalories(BigDecimal.valueOf(calories))
                .protein(BigDecimal.valueOf(protein))
                .carb(BigDecimal.valueOf(carb))
                .fat(BigDecimal.valueOf(fat))
                .build());
    }
}
