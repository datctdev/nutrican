package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.payment.dto.WithdrawRequest;
import com.sba.nutricanbe.payment.enums.WalletTransactionType;
import com.sba.nutricanbe.payment.repository.WalletTransactionRepository;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.*;
import com.sba.nutricanbe.user.enums.*;
import com.sba.nutricanbe.user.repository.*;
import com.sba.nutricanbe.user.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Idempotent demo richness: real Review-backed ratings for late PTs, milestones,
 * body composition, diet feedback, notifications, availability, lifecycle samples,
 * and one wallet withdrawal via CoachingWalletService.
 */
@Slf4j
@Component
@Order(40)
@RequiredArgsConstructor
public class DemoRichnessDataInitializer implements CommandLineRunner {

    public static final String FLAG_KEY = "DEMO_RICHNESS_V1";

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
            "Chế độ tăng cơ ổn, mình lên +2kg nạc sau 6 tuần."
    };

    private static final double[] REVIEW_RATINGS = {
            5.0, 5.0, 4.5, 5.0, 4.0, 4.5, 3.5, 5.0, 4.5, 5.0
    };

    private final SystemSettingRepository systemSettingRepository;
    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final ReviewRepository reviewRepository;
    private final PtAvailabilityWindowRepository availabilityRepository;
    private final PtVenueRepository venueRepository;
    private final PtClientMappingRepository mappingRepository;
    private final PtMappingSessionRepository sessionRepository;
    private final PtAppointmentRepository appointmentRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final ClientGoalMilestoneRepository milestoneRepository;
    private final DietLogRepository dietLogRepository;
    private final DietLogFeedbackRepository dietLogFeedbackRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final SessionDisputeRepository sessionDisputeRepository;
    private final PtConductReportRepository conductReportRepository;
    private final CoachingWalletService walletService;
    private final WalletTransactionRepository walletTransactionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (systemSettingRepository.existsById(FLAG_KEY)
                && "done".equals(
                systemSettingRepository.findById(FLAG_KEY).map(SystemSetting::getValue).orElse(""))) {
            // Still backfill reviews/ratings if DBs were seeded before richness (safe / idempotent)
            seedOfflineAndMissingReviews();
            resyncAllPtRatings();
            log.debug("{} already done — only resynced reviews/ratings", FLAG_KEY);
            return;
        }

        seedOfflineAndMissingReviews();
        resyncAllPtRatings();
        seedAvailabilityForCertifiedAndFreelance();
        seedBodyCompositionAndMilestones();
        seedDietLogFeedback();
        seedNotifications();
        seedLifecycleVariety();
        seedOpsFixtures();
        seedSampleWithdrawal();

        systemSettingRepository.save(SystemSetting.builder().key(FLAG_KEY).value("done").build());
        log.info("{} seeded — reviews sync, milestones, feedback, notifications, lifecycle, withdrawal", FLAG_KEY);
    }

    private void seedOfflineAndMissingReviews() {
        List<User> reviewers = userRepository.findAll().stream()
                .filter(u -> u.getEmail() != null && u.getEmail().startsWith("reviewer")
                        && u.getEmail().endsWith("@nutrican.com"))
                .toList();
        if (reviewers.isEmpty()) {
            log.warn("No reviewer*@nutrican.com — skip bulk review backfill");
            return;
        }
        for (String email : List.of(
                "pt@nutrican.com",
                "pt.certified@gmail.com",
                "pt.freelance@gmail.com",
                "pt.offline@gmail.com")) {
            userRepository.findByEmail(email).ifPresent(pt -> seedReviewsIfNeeded(pt, reviewers));
        }
    }

    private void seedReviewsIfNeeded(User pt, List<User> reviewers) {
        String sampleImage = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop";
        int n = Math.min(10, reviewers.size());
        for (int i = 0; i < n; i++) {
            User reviewer = reviewers.get(i);
            if (reviewRepository.existsByPtIdAndReviewerId(pt.getId(), reviewer.getId())) {
                continue;
            }
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
        syncPtRating(pt.getId());
    }

    private void syncPtRating(UUID ptId) {
        ptProfileRepository.findByUserId(ptId).ifPresent(profile -> {
            long count = reviewRepository.countByPtId(ptId);
            Double avg = reviewRepository.findAverageRatingByPtId(ptId);
            profile.setTotalReviews((int) count);
            profile.setRating(count == 0 || avg == null
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP));
            ptProfileRepository.save(profile);
        });
    }

    private void resyncAllPtRatings() {
        for (PtProfile profile : ptProfileRepository.findAll()) {
            if (profile.getUser() != null) {
                syncPtRating(profile.getUser().getId());
            }
        }
    }

    private void seedAvailabilityForCertifiedAndFreelance() {
        ptProfileRepository.findByUserEmail("pt.certified@gmail.com").ifPresent(profile -> {
            if (venueRepository.countByPtProfile_IdAndActiveTrue(profile.getId()) == 0) {
                venueRepository.save(PtVenue.builder()
                        .ptProfile(profile)
                        .name("Fit24 Quận 1")
                        .address("22 Lê Lợi, Quận 1, TP.HCM")
                        .mapsUrl("https://maps.google.com/?q=Fit24+Quan+1")
                        .note("Demo venue certified PT")
                        .active(true)
                        .build());
            }
            seedWeekdayAvailabilityIfEmpty(profile, 8, 12, 17, 20);
        });
        ptProfileRepository.findByUserEmail("pt.freelance@gmail.com").ifPresent(profile ->
                seedWeekdayAvailabilityIfEmpty(profile, 9, 12, 18, 21));
    }

    private void seedWeekdayAvailabilityIfEmpty(PtProfile profile, int amStart, int amEnd, int pmStart, int pmEnd) {
        if (!availabilityRepository.findByPtProfile_IdOrderByDayOfWeekAscStartTimeAsc(profile.getId()).isEmpty()) {
            return;
        }
        for (int day = 1; day <= 5; day++) {
            availabilityRepository.save(PtAvailabilityWindow.builder()
                    .ptProfile(profile)
                    .dayOfWeek(day)
                    .startTime(LocalTime.of(amStart, 0))
                    .endTime(LocalTime.of(amEnd, 0))
                    .slotMinutes(60)
                    .build());
            availabilityRepository.save(PtAvailabilityWindow.builder()
                    .ptProfile(profile)
                    .dayOfWeek(day)
                    .startTime(LocalTime.of(pmStart, 0))
                    .endTime(LocalTime.of(pmEnd, 0))
                    .slotMinutes(60)
                    .build());
        }
    }

    private void seedBodyCompositionAndMilestones() {
        for (String email : List.of("customer@nutrican.com", "solo@nutrican.com")) {
            userRepository.findByEmail(email).ifPresent(user -> {
                LocalDate base = LocalDate.now().minusWeeks(4);
                for (int w = 0; w < 5; w++) {
                    LocalDate date = base.plusWeeks(w);
                    BodyMetric metric = bodyMetricRepository.findByUser_IdAndRecordDate(user.getId(), date)
                            .orElse(BodyMetric.builder().user(user).recordDate(date).build());
                    BigDecimal weight = BigDecimal.valueOf(
                            email.startsWith("solo") ? 78.0 - w * 0.4 : 62.5 - w * 0.3);
                    metric.setWeight(weight);
                    metric.setBodyFatPercent(BigDecimal.valueOf(
                            email.startsWith("solo") ? 22.0 - w * 0.3 : 28.0 - w * 0.4));
                    metric.setMuscleMass(BigDecimal.valueOf(
                            email.startsWith("solo") ? 32.0 + w * 0.15 : 24.0 + w * 0.1));
                    metric.setLbm(BigDecimal.valueOf(
                            email.startsWith("solo") ? 60.0 + w * 0.1 : 45.0 + w * 0.08));
                    metric.setNote(w == 4 ? "InBody demo seed" : null);
                    bodyMetricRepository.save(metric);
                }

                seedMilestone(user.getId(), "Hoàn thành tuần 1 theo dõi cân nặng",
                        LocalDateTime.now().minusWeeks(3), "Ghi nhận đều đặn 7 ngày");
                seedMilestone(user.getId(), "Giảm 1kg so với baseline",
                        LocalDateTime.now().minusWeeks(1), "Cột mốc MANUAL demo");
            });
        }
    }

    private void seedMilestone(UUID userId, String title, LocalDateTime at, String note) {
        if (milestoneRepository.existsByUserIdAndTitle(userId, title)) {
            return;
        }
        milestoneRepository.save(ClientGoalMilestone.builder()
                .userId(userId)
                .milestoneType(MilestoneType.MANUAL)
                .title(title)
                .achievedAt(at)
                .note(note)
                .build());
    }

    private void seedDietLogFeedback() {
        userRepository.findByEmail("customer@nutrican.com").ifPresent(customer -> {
            List<DietLog> logs = dietLogRepository.findByCustomerIdOrderByCreatedAtDesc(
                    customer.getId(), PageRequest.of(0, 5));
            String[] digestion = {"OK", "OK", "BLOAT", "OK", "HEAVY"};
            for (int i = 0; i < logs.size(); i++) {
                DietLog dietLog = logs.get(i);
                if (dietLogFeedbackRepository.findByDietLogId(dietLog.getId()).isPresent()) {
                    continue;
                }
                dietLogFeedbackRepository.save(DietLogFeedback.builder()
                        .dietLogId(dietLog.getId())
                        .energyRating(3 + (i % 3))
                        .hungerAfterRating(2 + (i % 3))
                        .digestionStatus(digestion[i % digestion.length])
                        .digestionNote(i % 2 == 0 ? "Demo feedback sau bữa ăn" : null)
                        .build());
            }
        });
    }

    private void seedNotifications() {
        userRepository.findByEmail("customer@nutrican.com").ifPresent(customer -> {
            if (notificationRepository.countByUser_IdAndIsRead(customer.getId(), false) > 0) {
                return;
            }
            notificationService.notify(customer.getId(), NotificationPayload.builder()
                    .type("CHAT_MESSAGE")
                    .title("Tin nhắn mới từ PT")
                    .body("PT vừa trả lời trong chat coaching của bạn.")
                    .linkType(NotificationLinkType.CHAT)
                    .sendEmail(false)
                    .build());
            notificationService.notify(customer.getId(), NotificationPayload.builder()
                    .type("MEAL_PLAN")
                    .title("Kế hoạch tuần mới")
                    .body("PT đã xuất bản thực đơn tuần này — mở Diet Tracker để xem.")
                    .linkType(NotificationLinkType.MEAL_PLAN)
                    .sendEmail(false)
                    .build());
            notificationService.notify(customer.getId(), NotificationPayload.builder()
                    .type("APPOINTMENT")
                    .title("Nhắc lịch tập")
                    .body("Bạn có buổi offline sắp tới — kiểm tra Coaching → Lịch hẹn.")
                    .linkType(NotificationLinkType.APPOINTMENT)
                    .sendEmail(false)
                    .build());
        });
        userRepository.findByEmail("pt@nutrican.com").ifPresent(pt -> {
            if (notificationRepository.countByUser_IdAndIsRead(pt.getId(), false) > 0) {
                return;
            }
            notificationService.notify(pt.getId(), NotificationPayload.builder()
                    .type("NEW_DIET_LOG")
                    .title("HV gửi nhật ký ăn")
                    .body("Có nhật ký mới cần duyệt trong hàng chờ Diet Review.")
                    .linkType(NotificationLinkType.DIET_LOG)
                    .sendEmail(false)
                    .build());
            notificationService.notify(pt.getId(), NotificationPayload.builder()
                    .type("HIRE")
                    .title("Yêu cầu thuê PT")
                    .body("Demo: có HV đang chờ phản hồi (xem Clients / Marketplace).")
                    .linkType(NotificationLinkType.HIRE)
                    .sendEmail(false)
                    .build());
        });
    }

    private void seedLifecycleVariety() {
        User certified = userRepository.findByEmail("pt.certified@gmail.com").orElse(null);
        if (certified != null) {
            userRepository.findByEmail("hv.endreq@nutrican.com").ifPresent(hv -> {
                mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(certified.getId(), hv.getId())
                        .ifPresentOrElse(m -> {
                            if (m.getStatus() != ClientMappingStatus.END_REQUESTED
                                    && m.getStatus() != ClientMappingStatus.INACTIVE) {
                                m.setStatus(ClientMappingStatus.END_REQUESTED);
                                if (m.getCoachingStartedAt() == null) {
                                    m.setCoachingStartedAt(LocalDateTime.now().minusDays(30));
                                }
                                mappingRepository.save(m);
                            }
                        }, () -> mappingRepository.save(PtClientMapping.builder()
                                .pt(certified)
                                .client(hv)
                                .status(ClientMappingStatus.END_REQUESTED)
                                .coachingStartedAt(LocalDateTime.now().minusDays(30))
                                .build()));
            });
        }

        userRepository.findByEmail("customer@nutrican.com").flatMap(c ->
                mappingRepository.findFirstByClient_IdAndStatusIn(
                        c.getId(), List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))
        ).ifPresent(mapping -> {
            List<PtMappingSession> sessions = sessionRepository.findByMappingIdOrderBySequenceAsc(mapping.getId());
            sessions.stream()
                    .filter(x -> x.getEndTime() != null && x.getEndTime().isBefore(LocalDateTime.now().minusDays(1)))
                    .filter(x -> x.getStatus() == MappingSessionStatus.CONFIRMED
                            || x.getStatus() == MappingSessionStatus.SCHEDULED)
                    .skip(1)
                    .findFirst()
                    .ifPresent(target -> {
                        target.setStatus(MappingSessionStatus.AWAITING_CONFIRM);
                        target.setPtMarkedDoneAt(LocalDateTime.now().minusDays(2));
                        target.setConfirmDeadlineAt(LocalDateTime.now().minusHours(6));
                        sessionRepository.save(target);
                    });

            boolean hasCancelled = appointmentRepository.findAll().stream()
                    .anyMatch(a -> mapping.getId().equals(a.getMappingId())
                            && a.getStatus() == AppointmentStatus.CANCELLED);
            if (!hasCancelled) {
                appointmentRepository.save(PtAppointment.builder()
                        .clientId(mapping.getClient().getId())
                        .ptId(mapping.getPt().getId())
                        .mappingId(mapping.getId())
                        .startTime(LocalDateTime.now().minusDays(5).withHour(10).withMinute(0).withSecond(0).withNano(0))
                        .endTime(LocalDateTime.now().minusDays(5).withHour(11).withMinute(0).withSecond(0).withNano(0))
                        .type("OFFLINE")
                        .note("Demo appointment đã hủy")
                        .status(AppointmentStatus.CANCELLED)
                        .cancelledBy("CUSTOMER")
                        .cancelReason("Trùng lịch công việc")
                        .venueName("California Fitness Quận 7")
                        .build());
            }
        });
    }

    private void seedOpsFixtures() {
        userRepository.findByEmail("customer@nutrican.com").flatMap(c ->
                mappingRepository.findFirstByClient_IdAndStatus(c.getId(), ClientMappingStatus.ACTIVE)
        ).ifPresent(mapping -> {
            if (refundRequestRepository.findByStatusOrderByCreatedAtDesc(RefundStatus.PENDING_REVIEW).isEmpty()) {
                refundRequestRepository.save(RefundRequest.builder()
                        .mappingId(mapping.getId())
                        .customerId(mapping.getClient().getId())
                        .ptId(mapping.getPt().getId())
                        .reason(RefundReason.CUSTOMER_REQUEST)
                        .status(RefundStatus.PENDING_REVIEW)
                        .note("Demo: HV xin hoàn vì đổi lịch đột xuất")
                        .build());
            }
            if (conductReportRepository.findByStatusOrderByCreatedAtDesc(PtConductReportStatus.PENDING).isEmpty()) {
                // Use a different HV mapping if possible — avoid false-flagging main demo PT hard
                mappingRepository.findFirstByClient_IdAndStatus(
                                userRepository.findByEmail("hv.chi@nutrican.com").map(User::getId).orElse(UUID.randomUUID()),
                                ClientMappingStatus.ACTIVE)
                        .ifPresentOrElse(m -> conductReportRepository.save(PtConductReport.builder()
                                        .mappingId(m.getId())
                                        .customerId(m.getClient().getId())
                                        .ptId(m.getPt().getId())
                                        .reason("Demo report: PT hủy buổi sát giờ không báo trước")
                                        .status(PtConductReportStatus.PENDING)
                                        .build()),
                                () -> log.debug("Skip conduct report seed — no secondary ACTIVE mapping"));
            }

            sessionRepository.findByMappingIdOrderBySequenceAsc(mapping.getId()).stream()
                    .filter(s -> s.getStatus() == MappingSessionStatus.AWAITING_CONFIRM
                            || s.getStatus() == MappingSessionStatus.DISPUTED)
                    .findFirst()
                    .ifPresent(session -> {
                        if (sessionDisputeRepository.findByStatusOrderByCreatedAtDesc(SessionDisputeStatus.PENDING).isEmpty()) {
                            session.setStatus(MappingSessionStatus.DISPUTED);
                            sessionRepository.save(session);
                            sessionDisputeRepository.save(SessionDispute.builder()
                                    .sessionId(session.getId())
                                    .mappingId(mapping.getId())
                                    .customerId(mapping.getClient().getId())
                                    .ptId(mapping.getPt().getId())
                                    .reason("Demo: HV khiếu nại buổi tập không đủ thời lượng")
                                    .status(SessionDisputeStatus.PENDING)
                                    .build());
                        }
                    });
        });
        log.info("KYC document seed skipped (EkycSession requires live upload flow)");
    }

    private void seedSampleWithdrawal() {
        BigDecimal existing = walletTransactionRepository.sumSuccessByType(WalletTransactionType.WITHDRAWAL);
        if (existing != null && existing.signum() > 0) {
            return;
        }
        userRepository.findByEmail("pt@nutrican.com").ifPresent(pt -> {
            try {
                var wallet = walletService.getWallet(pt.getId());
                if (wallet.getAvailableBalance() == null
                        || wallet.getAvailableBalance().compareTo(BigDecimal.valueOf(50_000)) < 0) {
                    log.warn("Skip withdrawal seed — PT wallet available < 50k");
                    return;
                }
                WithdrawRequest req = new WithdrawRequest();
                req.setAmount(BigDecimal.valueOf(50_000));
                req.setBankName("Vietcombank");
                req.setBankAccountNumber("0123456789");
                walletService.withdraw(pt.getId(), req);
                log.info("Seeded sample WITHDRAWAL 50_000 for pt@");
            } catch (Exception ex) {
                log.warn("Skip withdrawal seed: {}", ex.getMessage());
            }
        });
    }
}
