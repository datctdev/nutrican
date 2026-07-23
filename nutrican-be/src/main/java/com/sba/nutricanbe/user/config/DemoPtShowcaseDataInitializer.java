package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.CoachingPaymentMethod;
import com.sba.nutricanbe.payment.enums.CoachingPaymentPurpose;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import com.sba.nutricanbe.payment.repository.CoachingEscrowRepository;
import com.sba.nutricanbe.payment.repository.CoachingPaymentRepository;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.AppointmentSlotHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Seed demo PT showcase — tuân thủ AppointmentSlotHelper + escrow hire offline:
 * - Không trùng giờ PT; trong availability
 * - Có Payment + escrow HELD (đúng luồng thanh toán)
 * - agreedAmount = perSession × sessionCount
 * - Mapping OFFLINE (không BOTH)
 */
@Slf4j
@Component
@Order(35)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "nutrican.demo.showcase-seed", havingValue = "true", matchIfMissing = true)
public class DemoPtShowcaseDataInitializer implements CommandLineRunner {

    /**
     * V4: happy (đổi lịch / markable / escrow dư / hủy +48h) + bad (escrow cạn)
     * + giữ rule V3 (OFFLINE, không trùng, money invariant).
     */
    public static final String FLAG_KEY = "DEMO_PT_SHOWCASE_V4";
    private static final String PASSWORD = "123456";
    private static final String PT_EMAIL = "pt@nutrican.com";
    private static final String DEMO_EMAIL = "customer@nutrican.com";
    private static final int SESSION_MINUTES = 60;
    private static final int SESSIONS_PAST = 2;
    private static final int SESSIONS_FUTURE = 3;
    private static final BigDecimal PER_SESSION = BigDecimal.valueOf(450_000);

    /** Fixture escrow: NORMAL; HEADROOM = +1 buổi chưa gán (H3); EMPTY = remaining 0 (B4). */
    private enum EscrowFixture { NORMAL, HEADROOM, EMPTY }

    private static final String[][] EXTRA_CLIENTS = {
            {"hv.an@nutrican.com", "Nguyễn Minh An", "0903111001", "MALE", "172"},
            {"hv.bao@nutrican.com", "Trần Thị Bảo", "0903111002", "FEMALE", "160"},
            {"hv.chi@nutrican.com", "Lê Hoàng Chi", "0903111003", "FEMALE", "165"},
    };

    private final SystemSettingRepository systemSettingRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PtClientMappingRepository mappingRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final FoodItemRepository foodItemRepository;
    private final DietLogRepository dietLogRepository;
    private final PtAppointmentRepository appointmentRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final PtProfileRepository ptProfileRepository;
    private final AppointmentSlotHelper appointmentSlotHelper;
    private final CoachingEscrowRepository escrowRepository;
    private final CoachingPaymentRepository paymentRepository;
    private final CoachingWalletService walletService;

    @Override
    @Transactional
    public void run(String... args) {
        if (systemSettingRepository.existsById(FLAG_KEY)
                && "done".equalsIgnoreCase(
                systemSettingRepository.findById(FLAG_KEY).map(SystemSetting::getValue).orElse(""))) {
            // Không refresh meal mỗi boot — tránh đụng mapping ACTIVE thật gắn pt@
            return;
        }

        Optional<User> ptOpt = userRepository.findByEmail(PT_EMAIL);
        if (ptOpt.isEmpty()) {
            log.warn("PT {} chưa sẵn sàng — skip {}", PT_EMAIL, FLAG_KEY);
            return;
        }
        FoodItem food = foodItemRepository.findAll().stream().findFirst().orElse(null);
        if (food == null) {
            log.warn("Chưa có FoodItem — skip {}", FLAG_KEY);
            return;
        }

        User pt = ptOpt.get();
        PtProfile profile = ptProfileRepository.findByUserId(pt.getId()).orElse(null);
        LocalDate today = DietDates.todayVn();

        // hv.an = H3 escrow dư; hv.bao = B4 escrow cạn; hv.chi = happy chuẩn
        EscrowFixture[] fixtures = {
                EscrowFixture.HEADROOM, EscrowFixture.EMPTY, EscrowFixture.NORMAL
        };

        int clientIndex = 0;
        for (String[] row : EXTRA_CLIENTS) {
            User client = ensureClient(row[0], row[1], row[2], row[3], Integer.parseInt(row[4]));
            PtClientMapping mapping = ensureActiveMapping(pt, client, TrainingMode.OFFLINE);
            clearSchedule(mapping.getId());
            seedScheduleNoOverlap(pt, client, mapping, profile, today, clientIndex, fixtures[clientIndex]);
            clientIndex++;
            seedPendingAndHistoryMeals(client, food, today);
        }

        final int demoClientIndex = clientIndex;
        userRepository.findByEmail(DEMO_EMAIL).ifPresent(demo -> {
            mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), demo.getId())
                    .ifPresent(m -> {
                        m.setSelectedTrainingMode(TrainingMode.OFFLINE);
                        mappingRepository.save(m);
                        clearSchedule(m.getId());
                        seedScheduleNoOverlap(pt, demo, m, profile, today, demoClientIndex, EscrowFixture.NORMAL);
                    });
            seedPendingAndHistoryMeals(demo, food, today);
        });

        systemSettingRepository.save(SystemSetting.builder().key(FLAG_KEY).value("done").build());
        log.info("{} seeded — H1–H4 + B4 (hv.bao cạn / hv.an dư) + OFFLINE không trùng", FLAG_KEY);
    }

    /**
     * True nếu bất kỳ appointment của mapping này chồng lên appointment mapping khác của cùng PT.
     */
    private boolean hasOverlapWithOthers(UUID ptId, UUID mappingId) {
        List<PtAppointment> mine = appointmentRepository.findByMappingId(mappingId);
        for (PtAppointment a : mine) {
            List<PtAppointment> hits = appointmentRepository.findOverlapping(
                    ptId, a.getStartTime(), a.getEndTime(),
                    List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));
            boolean conflict = hits.stream().anyMatch(h -> !mappingId.equals(h.getMappingId()));
            if (conflict) return true;
        }
        return false;
    }

    private void clearSchedule(UUID mappingId) {
        appointmentRepository.deleteByMappingId(mappingId);
        mappingSessionRepository.deleteByMappingId(mappingId);
    }

    private void refreshPendingMealsIfEmpty() {
        Optional<User> ptOpt = userRepository.findByEmail(PT_EMAIL);
        FoodItem food = foodItemRepository.findAll().stream().findFirst().orElse(null);
        if (ptOpt.isEmpty() || food == null) return;
        User pt = ptOpt.get();
        LocalDate today = DietDates.todayVn();
        List<PtClientMapping> active = mappingRepository.findByPtIdWithClients(pt.getId()).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .toList();
        for (PtClientMapping m : active) {
            User client = m.getClient();
            long pending = dietLogRepository.findByCustomerIdAndLogDate(client.getId(), today).stream()
                    .filter(l -> l.getReviewStatus() == DietLogReviewStatus.PENDING)
                    .count();
            if (pending == 0) {
                seedOnePendingMeal(client, food, today, MealPeriod.NOON, "Cơm gà xé · chờ PT duyệt (demo)");
                seedOnePendingMeal(client, food, today.minusDays(1), MealPeriod.EVENING, "Salad ức gà · chờ PT duyệt (demo)");
            }
        }
    }

    private User ensureClient(String email, String fullName, String phone, String gender, int heightCm) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    existing.setPasswordHash(passwordEncoder.encode(PASSWORD));
                    existing.setFullName(fullName);
                    existing.setStatus(UserStatus.ACTIVE);
                    existing.setPasswordSetRequired(false);
                    existing.setHeightCm(heightCm);
                    existing.setGender(gender);
                    existing.setNutritionGoal(NutritionGoal.WEIGHT_LOSS);
                    existing.setOnboardingCompletedAt(LocalDateTime.now());
                    User saved = userRepository.save(existing);
                    ensureMacro(saved);
                    return saved;
                })
                .orElseGet(() -> {
                    User created = userRepository.save(User.builder()
                            .email(email)
                            .passwordHash(passwordEncoder.encode(PASSWORD))
                            .fullName(fullName)
                            .role(UserRole.CUSTOMER)
                            .status(UserStatus.ACTIVE)
                            .phoneNumber(phone)
                            .address("TP. Hồ Chí Minh")
                            .dateOfBirth(LocalDate.of(1999, 4, 15))
                            .passwordSetRequired(false)
                            .isKycVerified(true)
                            .heightCm(heightCm)
                            .gender(gender)
                            .nutritionGoal(NutritionGoal.WEIGHT_LOSS)
                            .onboardingCompletedAt(LocalDateTime.now())
                            .build());
                    ensureMacro(created);
                    return created;
                });
    }

    private void ensureMacro(User user) {
        if (macroTargetRepository.findByUserId(user.getId()).isPresent()) return;
        macroTargetRepository.save(MacroTarget.builder()
                .user(user)
                .dailyCalories(BigDecimal.valueOf(1900))
                .protein(BigDecimal.valueOf(120))
                .carb(BigDecimal.valueOf(200))
                .fat(BigDecimal.valueOf(55))
                .build());
    }

    private PtClientMapping ensureActiveMapping(User pt, User client, TrainingMode mode) {
        return mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), client.getId())
                .map(m -> {
                    m.setStatus(ClientMappingStatus.ACTIVE);
                    if (m.getCoachingStartedAt() == null) {
                        m.setCoachingStartedAt(DietDates.nowVn().minusDays(21));
                    }
                    m.setSelectedTrainingMode(mode);
                    m.setVenueName("California Fitness Quận 7");
                    m.setVenueAddress("Số 1 Nguyễn Văn Linh, Quận 7, TP.HCM");
                    m.setPerSessionAmount(PER_SESSION);
                    m.setAgreedRateUnit("SESSION_60");
                    return mappingRepository.save(m);
                })
                .orElseGet(() -> mappingRepository.save(PtClientMapping.builder()
                        .pt(pt)
                        .client(client)
                        .status(ClientMappingStatus.ACTIVE)
                        .coachingStartedAt(DietDates.nowVn().minusDays(21))
                        .selectedTrainingMode(mode)
                        .venueName("California Fitness Quận 7")
                        .venueAddress("Số 1 Nguyễn Văn Linh, Quận 7, TP.HCM")
                        .perSessionAmount(PER_SESSION)
                        .agreedRateUnit("SESSION_60")
                        .build()));
    }

    /**
     * Past → CONFIRMED + release escrow; markable (hôm nay đã tới giờ) → SCHEDULED;
     * future → SCHEDULED. Payment + escrow đủ gói.
     * HEADROOM: escrow dư ≥ 1 buổi (H3 thêm buổi OK).
     * EMPTY: chỉ buổi quá khứ đã release hết (B4 thêm buổi fail).
     */
    private void seedScheduleNoOverlap(
            User pt, User client, PtClientMapping mapping, PtProfile profile,
            LocalDate today, int clientIndex, EscrowFixture fixture) {

        List<LocalDateTime> pastStarts = pickSlots(pt.getId(), profile, today, true, SESSIONS_PAST, clientIndex);
        LocalDateTime markable = null;
        List<LocalDateTime> futureStarts = List.of();
        if (fixture != EscrowFixture.EMPTY) {
            markable = pickMarkableSlot(pt.getId(), profile, today, clientIndex, pastStarts);
            futureStarts = pickSlots(pt.getId(), profile, today, false, SESSIONS_FUTURE, clientIndex);
        }

        List<LocalDateTime> allStarts = new ArrayList<>();
        allStarts.addAll(pastStarts);
        if (markable != null) {
            allStarts.add(markable);
        }
        allStarts.addAll(futureStarts);

        if (allStarts.isEmpty()) {
            log.warn("Không tìm được slot trống cho {} — bỏ qua lịch", client.getEmail());
            return;
        }

        List<LocalDateTime[]> slotPairs = allStarts.stream()
                .map(s -> new LocalDateTime[]{s, s.plusMinutes(SESSION_MINUTES)})
                .toList();
        appointmentSlotHelper.assertSessionsDoNotOverlapEachOther(slotPairs);

        int sessionCount = allStarts.size();
        int escrowSessionUnits = sessionCount + (fixture == EscrowFixture.HEADROOM ? 1 : 0);
        mapping.setPerSessionAmount(PER_SESSION);
        mapping.setSessionCount(sessionCount);
        mapping.setAgreedAmount(PER_SESSION.multiply(BigDecimal.valueOf(escrowSessionUnits)));
        mapping.setSelectedTrainingMode(TrainingMode.OFFLINE);
        mapping = mappingRepository.save(mapping);
        ensureEscrowForPackage(mapping, PER_SESSION.multiply(BigDecimal.valueOf(escrowSessionUnits)));

        int seq = 1;
        LocalDateTime firstStart = null;
        LocalDateTime firstEnd = null;
        for (LocalDateTime start : allStarts) {
            LocalDateTime end = start.plusMinutes(SESSION_MINUTES);
            appointmentSlotHelper.assertNoOverlap(pt.getId(), start, end, null);
            if (profile != null) {
                appointmentSlotHelper.assertSlotWithinAvailability(profile.getId(), start, end);
            }

            boolean fullyPastDay = start.toLocalDate().isBefore(today);
            boolean isMarkable = markable != null && start.equals(markable);
            MappingSessionStatus sessionStatus = fullyPastDay && !isMarkable
                    ? MappingSessionStatus.CONFIRMED
                    : MappingSessionStatus.SCHEDULED;

            PtMappingSession session = mappingSessionRepository.save(PtMappingSession.builder()
                    .mappingId(mapping.getId())
                    .sequence(seq++)
                    .startTime(start)
                    .endTime(end)
                    .venueName(mapping.getVenueName() != null ? mapping.getVenueName() : "Phòng gym demo")
                    .venueAddress(mapping.getVenueAddress())
                    .status(sessionStatus)
                    .ptMarkedDoneAt(sessionStatus == MappingSessionStatus.CONFIRMED ? start.plusMinutes(55) : null)
                    .build());

            appointmentRepository.save(PtAppointment.builder()
                    .clientId(client.getId())
                    .ptId(pt.getId())
                    .mappingId(mapping.getId())
                    .mappingSessionId(session.getId())
                    .startTime(start)
                    .endTime(end)
                    .type("OFFLINE")
                    .note("Buổi tập offline · " + client.getFullName())
                    .status(AppointmentStatus.CONFIRMED)
                    .venueName(session.getVenueName())
                    .venueAddress(session.getVenueAddress())
                    .build());

            if (sessionStatus == MappingSessionStatus.CONFIRMED) {
                try {
                    walletService.releaseToPt(
                            mapping.getId(), PER_SESSION, "MAPPING_SESSION", session.getId(),
                            "Demo seed — buổi quá khứ đã chốt");
                    session.setReleasedAmount(PER_SESSION);
                    mappingSessionRepository.save(session);
                } catch (Exception ex) {
                    log.warn("Không release escrow buổi {}: {}", session.getId(), ex.getMessage());
                }
            }

            if (firstStart == null) {
                firstStart = start;
                firstEnd = end;
            }
        }

        mapping.setFirstSessionStart(firstStart);
        mapping.setFirstSessionEnd(firstEnd);
        mappingRepository.save(mapping);

        if (fixture == EscrowFixture.EMPTY) {
            try {
                walletService.refundRemainingIfPresent(mapping.getId(), "Demo V4 — escrow cạn (B4)");
            } catch (Exception ex) {
                log.warn("Không drain escrow EMPTY {}: {}", client.getEmail(), ex.getMessage());
            }
        }
    }

    /**
     * Đảm bảo remaining escrow ≈ targetAmount trước khi tạo buổi (refund dư / top-up thiếu / hold mới).
     */
    private void ensureEscrowForPackage(PtClientMapping mapping, BigDecimal targetAmount) {
        UUID mappingId = mapping.getId();
        BigDecimal remaining = walletService.getRemainingEscrow(mappingId);

        if (escrowRepository.findByMappingId(mappingId).isEmpty()) {
            mapping.setAgreedAmount(targetAmount);
            mappingRepository.save(mapping);
            ensureHireEscrow(mapping);
            return;
        }

        if (remaining.compareTo(targetAmount) > 0) {
            BigDecimal excess = remaining.subtract(targetAmount);
            try {
                walletService.refundToCustomer(
                        mappingId, excess, "DEMO_SEED_ADJUST", UUID.randomUUID(),
                        "Demo V4 — chỉnh dư escrow");
            } catch (Exception ex) {
                log.warn("Không refund dư escrow {}: {}", mappingId, ex.getMessage());
            }
            remaining = walletService.getRemainingEscrow(mappingId);
        }

        if (remaining.compareTo(targetAmount) < 0) {
            BigDecimal need = targetAmount.subtract(remaining);
            LocalDateTime now = DietDates.nowVn();
            String suffix = mappingId.toString().replace("-", "").substring(0, 12).toUpperCase();
            Payment topUp = paymentRepository.save(Payment.builder()
                    .mappingId(mappingId)
                    .method(CoachingPaymentMethod.VNPAY)
                    .purpose(CoachingPaymentPurpose.EXTRA_SESSIONS)
                    .status(CoachingPaymentStatus.SUCCESS)
                    .amount(need)
                    .currency("VND")
                    .orderNumber("DEMOT" + now.toLocalDate().toString().replace("-", "") + suffix.substring(0, 6))
                    .txnRef("NCT" + suffix + System.nanoTime() % 10000)
                    .providerTxnNo("SEED-T-" + suffix + "-" + System.nanoTime() % 100000)
                    .providerResponseCode("00")
                    .paidAt(now.minusDays(1))
                    .expiresAt(now.minusDays(1))
                    .build());
            try {
                walletService.topUpEscrowFromVnPay(topUp);
            } catch (Exception ex) {
                log.warn("Không top-up escrow {}: {}", mappingId, ex.getMessage());
            }
        }
    }

    private void ensureHireEscrow(PtClientMapping mapping) {
        if (escrowRepository.findByMappingId(mapping.getId()).isPresent()) {
            return;
        }
        LocalDateTime now = DietDates.nowVn();
        String suffix = mapping.getId().toString().replace("-", "").substring(0, 12).toUpperCase();
        Payment payment = paymentRepository.save(Payment.builder()
                .mappingId(mapping.getId())
                .method(CoachingPaymentMethod.VNPAY)
                .purpose(CoachingPaymentPurpose.HIRE)
                .status(CoachingPaymentStatus.SUCCESS)
                .amount(mapping.getAgreedAmount())
                .currency("VND")
                .orderNumber("DEMO" + now.toLocalDate().toString().replace("-", "") + suffix.substring(0, 8))
                .txnRef("NCD" + suffix)
                .providerTxnNo("SEED-" + suffix)
                .providerResponseCode("00")
                .paidAt(now.minusDays(14))
                .expiresAt(now.minusDays(14))
                .build());
        walletService.holdSuccessfulPayment(payment);
    }

    private LocalDateTime pickMarkableSlot(
            UUID ptId, PtProfile profile, LocalDate today, int clientIndex,
            List<LocalDateTime> alreadyPicked) {
        LocalDateTime now = DietDates.nowVn();
        for (int lookback = 0; lookback <= 2; lookback++) {
            LocalDate day = today.minusDays(lookback);
            for (LocalTime hour : candidateHours(day.getDayOfWeek(), clientIndex)) {
                LocalDateTime start = day.atTime(hour);
                LocalDateTime end = start.plusMinutes(SESSION_MINUTES);
                if (lookback == 0 && !start.isBefore(now)) {
                    continue;
                }
                if (!isFreeSlot(ptId, profile, start, end, alreadyPicked)) {
                    continue;
                }
                return start;
            }
        }
        return null;
    }

    private boolean isFreeSlot(
            UUID ptId, PtProfile profile, LocalDateTime start, LocalDateTime end,
            List<LocalDateTime> alreadyPicked) {
        if (profile != null) {
            try {
                appointmentSlotHelper.assertSlotWithinAvailability(profile.getId(), start, end);
            } catch (Exception ex) {
                return false;
            }
        } else if (!fitsDefaultAvailability(start.getDayOfWeek(), start.toLocalTime(), end.toLocalTime())) {
            return false;
        }
        if (appointmentSlotHelper.hasOverlap(ptId, start, end, null)) {
            return false;
        }
        return alreadyPicked.stream().noneMatch(s -> {
            LocalDateTime e = s.plusMinutes(SESSION_MINUTES);
            return start.isBefore(e) && s.isBefore(end);
        });
    }

    /**
     * Chọn slot trong khung availability của PT (đồng bộ OfflineHireTestDataInitializer).
     * past=true: lùi từ hôm qua; past=false: tiến từ ngày mai.
     * hourBias theo clientIndex để phân tán HV trên các khung giờ khác nhau.
     */
    private List<LocalDateTime> pickSlots(
            UUID ptId, PtProfile profile, LocalDate today, boolean past, int need, int clientIndex) {
        List<LocalDateTime> picked = new ArrayList<>();
        int dayStep = past ? -1 : 1;
        LocalDate cursor = today.plusDays(dayStep);

        for (int guard = 0; guard < 60 && picked.size() < need; guard++) {
            List<LocalTime> hours = candidateHours(cursor.getDayOfWeek(), clientIndex);
            for (LocalTime hour : hours) {
                if (picked.size() >= need) break;
                LocalDateTime start = cursor.atTime(hour);
                LocalDateTime end = start.plusMinutes(SESSION_MINUTES);
                if (profile != null) {
                    try {
                        appointmentSlotHelper.assertSlotWithinAvailability(profile.getId(), start, end);
                    } catch (Exception ex) {
                        continue;
                    }
                } else if (!fitsDefaultAvailability(cursor.getDayOfWeek(), hour, end.toLocalTime())) {
                    continue;
                }
                if (appointmentSlotHelper.hasOverlap(ptId, start, end, null)) {
                    continue;
                }
                // Tránh trùng trong batch đang pick (chưa save)
                boolean selfClash = picked.stream().anyMatch(s -> {
                    LocalDateTime e = s.plusMinutes(SESSION_MINUTES);
                    return start.isBefore(e) && s.isBefore(end);
                });
                if (selfClash) continue;

                picked.add(start);
            }
            cursor = cursor.plusDays(dayStep);
        }

        if (past) {
            picked.sort(LocalDateTime::compareTo); // cũ → mới
        }
        return picked;
    }

    /** Khung giờ ưu tiên lệch theo HV — vẫn phải nằm trong availability. */
    private List<LocalTime> candidateHours(DayOfWeek day, int clientIndex) {
        List<LocalTime> hours = new ArrayList<>();
        if (day == DayOfWeek.SUNDAY) {
            return hours;
        }
        if (day == DayOfWeek.SATURDAY) {
            // Sat 08–12
            int[] sat = {8, 9, 10, 11};
            rotateInto(hours, sat, clientIndex);
            return hours;
        }
        // Mon–Fri: sáng 07–11 rồi tối 17–21
        int[] morning = {7, 8, 9, 10};
        int[] evening = {17, 18, 19, 20};
        if (clientIndex % 2 == 0) {
            rotateInto(hours, morning, clientIndex / 2);
            rotateInto(hours, evening, clientIndex / 2);
        } else {
            rotateInto(hours, evening, clientIndex / 2);
            rotateInto(hours, morning, clientIndex / 2);
        }
        return hours;
    }

    private void rotateInto(List<LocalTime> out, int[] hours, int rotate) {
        int n = hours.length;
        int start = Math.floorMod(rotate, n);
        for (int i = 0; i < n; i++) {
            out.add(LocalTime.of(hours[(start + i) % n], 0));
        }
    }

    private boolean fitsDefaultAvailability(DayOfWeek day, LocalTime start, LocalTime end) {
        if (day == DayOfWeek.SUNDAY) return false;
        if (day == DayOfWeek.SATURDAY) {
            return !start.isBefore(LocalTime.of(8, 0)) && !end.isAfter(LocalTime.of(12, 0));
        }
        boolean morning = !start.isBefore(LocalTime.of(7, 0)) && !end.isAfter(LocalTime.of(11, 0));
        boolean evening = !start.isBefore(LocalTime.of(17, 0)) && !end.isAfter(LocalTime.of(21, 0));
        return morning || evening;
    }

    private void seedPendingAndHistoryMeals(User client, FoodItem food, LocalDate today) {
        long pendingToday = dietLogRepository.findByCustomerIdAndLogDate(client.getId(), today).stream()
                .filter(l -> l.getReviewStatus() == DietLogReviewStatus.PENDING)
                .count();
        if (pendingToday == 0) {
            seedOnePendingMeal(client, food, today, MealPeriod.MORNING, "Bánh mì ốp la · chờ duyệt");
            seedOnePendingMeal(client, food, today, MealPeriod.NOON, "Cơm ức gà rau củ · chờ duyệt");
            seedOnePendingMeal(client, food, today.minusDays(1), MealPeriod.EVENING, "Soup bí đỏ · chờ duyệt");
        }
        boolean hasApproved = dietLogRepository.findByCustomerIdAndLogDate(client.getId(), today.minusDays(2)).stream()
                .anyMatch(l -> l.getReviewStatus() == DietLogReviewStatus.APPROVED);
        if (!hasApproved) {
            MacroNutrients macros = scaleFood(food, BigDecimal.valueOf(180));
            dietLogRepository.save(DietLog.builder()
                    .customerId(client.getId())
                    .mealType(MealPeriods.toMealType(MealPeriod.NOON))
                    .mealPeriod(MealPeriod.NOON)
                    .foodDescription("Bún bò · đã duyệt (demo)")
                    .matchedFoodName(food.getNameVi())
                    .foodItemId(food.getId())
                    .logDate(today.minusDays(2))
                    .macrosJson(macros)
                    .status(DietLogStatus.LOGGED)
                    .reviewStatus(DietLogReviewStatus.APPROVED)
                    .isPtNotified(true)
                    .mealSource(MealSource.HOME_COOKED)
                    .recognitionSource(RecognitionSource.MANUAL)
                    .ptReviewedAt(DietDates.nowVn().minusDays(1))
                    .build());
        }
    }

    private void seedOnePendingMeal(User client, FoodItem food, LocalDate logDate,
                                    MealPeriod period, String description) {
        boolean exists = dietLogRepository.findByCustomerIdAndLogDate(client.getId(), logDate).stream()
                .anyMatch(l -> l.getMealPeriod() == period && l.getReviewStatus() == DietLogReviewStatus.PENDING);
        if (exists) return;

        MacroNutrients macros = scaleFood(food, BigDecimal.valueOf(160 + period.ordinal() * 15L));
        dietLogRepository.save(DietLog.builder()
                .customerId(client.getId())
                .mealType(MealPeriods.toMealType(period))
                .mealPeriod(period)
                .foodDescription(description + " — " + food.getNameVi())
                .matchedFoodName(food.getNameVi())
                .foodItemId(food.getId())
                .logDate(logDate)
                .macrosJson(macros)
                .imageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80")
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.PENDING)
                .isPtNotified(true)
                .mealSource(MealSource.HOME_COOKED)
                .recognitionSource(RecognitionSource.MANUAL)
                .build());
    }

    private MacroNutrients scaleFood(FoodItem food, BigDecimal qtyGrams) {
        BigDecimal base = food.getServingSizeG() != null && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);
        BigDecimal factor = qtyGrams.divide(base, 4, RoundingMode.HALF_UP);
        return MacroNutrients.of(
                nz(food.getCalories()).multiply(factor).setScale(1, RoundingMode.HALF_UP),
                nz(food.getProtein()).multiply(factor).setScale(2, RoundingMode.HALF_UP),
                nz(food.getCarb()).multiply(factor).setScale(2, RoundingMode.HALF_UP),
                nz(food.getFat()).multiply(factor).setScale(2, RoundingMode.HALF_UP));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
