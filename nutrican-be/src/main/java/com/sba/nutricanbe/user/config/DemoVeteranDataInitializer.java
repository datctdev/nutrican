package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.common.util.MealPeriods;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanItem;
import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.MealPlanSkipReason;
import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.enums.RecognitionSource;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.ClientGoal;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.ClientGoalRepository;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.chat.entity.ChatMessage;
import com.sba.nutricanbe.chat.enums.ChatMessageType;
import com.sba.nutricanbe.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;


@Slf4j
@Component
@Order(30)
@RequiredArgsConstructor
public class DemoVeteranDataInitializer implements CommandLineRunner {

    public static final String FLAG_KEY = "DEMO_VETERAN_FIXTURES_V4";
    private static final String SOLO_EMAIL = "solo@nutrican.com";
    private static final String COACHED_EMAIL = "customer@nutrican.com";
    private static final String PT_EMAIL = "pt@nutrican.com";

    private final SystemSettingRepository systemSettingRepository;
    private final UserRepository userRepository;
    private final FoodItemRepository foodItemRepository;
    private final DietLogRepository dietLogRepository;
    private final SelfPlanItemRepository selfPlanItemRepository;
    private final SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final ClientGoalRepository clientGoalRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final PtClientMappingRepository mappingRepository;
    private final ChatMessageRepository chatMessageRepository;


    private static final double[] MEAL_CAL_SHARE = {0.22, 0.28, 0.18, 0.27, 0.05};

    @Override
    @Transactional
    public void run(String... args) {
        Optional<User> soloOpt = userRepository.findByEmail(SOLO_EMAIL);
        Optional<User> coachedOpt = userRepository.findByEmail(COACHED_EMAIL);
        Optional<User> ptOpt = userRepository.findByEmail(PT_EMAIL);
        if (soloOpt.isEmpty() || coachedOpt.isEmpty() || ptOpt.isEmpty()) {
            log.warn("Demo users not ready — skip {}", FLAG_KEY);
            return;
        }

        FoodItem food = pickFood();
        if (food == null) {
            log.warn("No FoodItem in catalog — skip {}", FLAG_KEY);
            return;
        }

        rescaleCoachedPtPlanPortions(coachedOpt.get(), food);

        if (systemSettingRepository.existsById(FLAG_KEY)
                && "done".equalsIgnoreCase(
                systemSettingRepository.findById(FLAG_KEY).map(SystemSetting::getValue).orElse(""))) {
            log.debug("{} already done — skip veteran demo fixtures", FLAG_KEY);
        } else {
            User solo = soloOpt.get();
            User coached = coachedOpt.get();
            User pt = ptOpt.get();
            LocalDate today = DietDates.todayVn();

            seedGoals(solo, NutritionGoal.WEIGHT_LOSS, bd(72), bd(65));
            seedGoals(coached, NutritionGoal.MAINTAIN, bd(64), bd(60));
            seedBodyMetrics(solo, today, 72.0, -0.25);
            seedBodyMetrics(coached, today, 63.5, -0.1);

            seedHistoryLogs(solo, food, today, false);
            seedHistoryLogs(coached, food, today, true);

            seedYesterdayBackfillDemo(solo, coached, food, today);

            seedSoloPlans(solo, food, today);
            seedCoachedPlans(coached, pt, food, today);

            systemSettingRepository.save(SystemSetting.builder().key(FLAG_KEY).value("done").build());
            log.info("{} seeded — 14d fixtures for {} and {}", FLAG_KEY, SOLO_EMAIL, COACHED_EMAIL);
        }

        LocalDate today = DietDates.todayVn();
        soloOpt.ifPresent(solo -> {
            refreshYesterdayBackfillDemo(solo, food, today);
            refreshYesterdayOvernightDemo(solo, food, today, null);
            refreshTodayLateTickDemo(solo, food, today);
        });
        coachedOpt.ifPresent(coached -> ptOpt.ifPresent(pt -> {
            refreshYesterdayBackfillDemo(coached, food, today);
            refreshYesterdayOvernightDemo(coached, food, today, pt);
            refreshTodayLateTickDemo(coached, food, today);
            refreshTodayEveningReviewDemo(coached, pt, food, today);
            ensureDemoMappingReady(pt, coached);
            refreshDemoChatHistory(pt, coached);
        }));
    }

    /** Ensure ACTIVE mapping + coachingStartedAt (≥8 days ago) for weekly-summary / chat demos. */
    private void ensureDemoMappingReady(User pt, User coached) {
        mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), coached.getId())
                .ifPresentOrElse(mapping -> {
                    boolean dirty = false;
                    if (mapping.getStatus() != ClientMappingStatus.ACTIVE) {
                        mapping.setStatus(ClientMappingStatus.ACTIVE);
                        dirty = true;
                    }
                    if (mapping.getCoachingStartedAt() == null
                            || mapping.getCoachingStartedAt().toLocalDate().isAfter(DietDates.todayVn().minusDays(8))) {
                        mapping.setCoachingStartedAt(DietDates.nowVn().minusDays(14));
                        dirty = true;
                    }
                    if (dirty) {
                        mappingRepository.save(mapping);
                        log.info("Demo mapping ready: {} ↔ {} (coachingStartedAt={})",
                                pt.getEmail(), coached.getEmail(), mapping.getCoachingStartedAt());
                    }
                }, () -> {
                    PtClientMapping created = mappingRepository.save(PtClientMapping.builder()
                            .pt(pt)
                            .client(coached)
                            .status(ClientMappingStatus.ACTIVE)
                            .coachingStartedAt(DietDates.nowVn().minusDays(14))
                            .build());
                    log.info("Created demo ACTIVE mapping {} for chat/progress", created.getId());
                });
    }

    /**
     * Seed ~45 messages across several days so FE scroll-up pagination can be demoed.
     * Idempotent: skips when mapping already has ≥40 messages.
     */
    private void refreshDemoChatHistory(User pt, User coached) {
        Optional<PtClientMapping> mappingOpt = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), coached.getId());
        if (mappingOpt.isEmpty() || mappingOpt.get().getStatus() != ClientMappingStatus.ACTIVE) {
            return;
        }
        PtClientMapping mapping = mappingOpt.get();
        long existing = chatMessageRepository
                .findByMappingIdOrderByCreatedAtDesc(mapping.getId(),
                        org.springframework.data.domain.PageRequest.of(0, 1))
                .getTotalElements();
        if (existing >= 40) {
            return;
        }

        String[] ptLines = {
                "Chào bạn, hôm nay mình check tiến độ nhé.",
                "Calo sáng ổn rồi, nhớ uống đủ nước.",
                "Buổi chiều ưu tiên protein trước tinh bột.",
                "Nếu đói nhẹ có thể thêm sữa chua không đường.",
                "Mai gửi ảnh InBody nếu tiện nhé."
        };
        String[] clientLines = {
                "Dạ em chào PT ạ.",
                "Em vừa cập nhật cân nặng rồi ạ.",
                "Bữa trưa em ăn cơm tấm, hơi no.",
                "Em sẽ chỉnh lại khẩu phần tối.",
                "Cảm ơn PT, em làm theo."
        };

        int saved = 0;
        for (int day = 0; day < 5; day++) {
            for (int i = 0; i < 9; i++) {
                boolean fromPt = i % 2 == 0;
                String content = fromPt
                        ? ptLines[i % ptLines.length] + " (ngày " + (day + 1) + "#" + (i + 1) + ")"
                        : clientLines[i % clientLines.length] + " (ngày " + (day + 1) + "#" + (i + 1) + ")";
                chatMessageRepository.save(ChatMessage.builder()
                        .mappingId(mapping.getId())
                        .senderId(fromPt ? pt.getId() : coached.getId())
                        .recipientId(fromPt ? coached.getId() : pt.getId())
                        .content(content)
                        .messageType(ChatMessageType.TEXT)
                        .build());
                saved++;
            }
        }
        chatMessageRepository.stampDemoChatTimestamps(mapping.getId());
        log.info("Demo chat seeded {} messages for mapping {}", saved, mapping.getId());
    }


    private void refreshYesterdayBackfillDemo(User user, FoodItem food, LocalDate today) {
        if (food == null) {
            return;
        }
        LocalDate yesterday = today.minusDays(1);
        List<DietLog> yesterdayLogs = dietLogRepository.findByCustomerIdAndLogDate(user.getId(), yesterday);
        boolean onlyMorning = yesterdayLogs.size() == 1
                && yesterdayLogs.get(0).getMealPeriod() == MealPeriod.MORNING
                && yesterdayLogs.get(0).getFoodDescription() != null
                && yesterdayLogs.get(0).getFoodDescription().contains("Demo backfill");
        if (onlyMorning) {
            return;
        }
        yesterdayLogs.forEach(dietLogRepository::delete);
        saveLog(user, food, yesterday, MealPeriod.MORNING, null,
                "Demo backfill · chỉ có sáng — bù trưa/chiều bằng Ghi nhật ký");
    }

    private void seedYesterdayBackfillDemo(User solo, User coached, FoodItem food, LocalDate today) {
        LocalDate yesterday = today.minusDays(1);
        for (User user : List.of(solo, coached)) {
            dietLogRepository.findByCustomerIdAndLogDate(user.getId(), yesterday)
                    .forEach(dietLogRepository::delete);
            saveLog(user, food, yesterday, MealPeriod.MORNING, null,
                    "Demo backfill · chỉ có sáng — bù trưa/chiều bằng Ghi nhật ký");
        }
        log.info("Yesterday {} backfill demo: {} + {} — only MORNING log", yesterday, SOLO_EMAIL, COACHED_EMAIL);
    }


    private void refreshYesterdayOvernightDemo(User user, FoodItem food, LocalDate today, User pt) {
        if (food == null) {
            return;
        }
        LocalDate yesterday = today.minusDays(1);
        boolean coached = COACHED_EMAIL.equalsIgnoreCase(user.getEmail());

        dietLogRepository.findByCustomerIdAndLogDate(user.getId(), yesterday).stream()
                .filter(l -> l.getMealPeriod() == MealPeriod.LATE)
                .forEach(dietLogRepository::delete);

        if (!coached) {
            ensureSoloYesterdayPlan(user, food, yesterday);
        } else if (pt != null) {
            ensureCoachedYesterdayPlan(user, pt, food, yesterday);
        }
        log.debug("Yesterday overnight plan refreshed for {} on {}", user.getEmail(), yesterday);
    }

    private void ensureSoloYesterdayPlan(User solo, FoodItem food, LocalDate yesterday) {
        for (MealPeriod period : MealPeriod.values()) {
            cleanupDuplicateSelfItems(solo.getId(), yesterday, period);
            if (!hasSelfPlanForPeriod(solo.getId(), yesterday, period)) {
                saveSelf(solo, food, yesterday, period, period == MealPeriod.MORNING, null);
            }
        }

        DietLog morningLog = dietLogRepository.findByCustomerIdAndLogDate(solo.getId(), yesterday).stream()
                .filter(l -> l.getMealPeriod() == MealPeriod.MORNING)
                .findFirst()
                .orElse(null);

        for (SelfPlanItem item : selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(solo.getId(), yesterday)) {
            MealPeriod period = item.getMealPeriod();
            if (period == MealPeriod.LATE) {
                item.setEaten(false);
                item.setDietLogId(null);
                selfPlanItemRepository.save(item);
            } else if (period == MealPeriod.MORNING && morningLog != null) {
                item.setEaten(true);
                item.setDietLogId(morningLog.getId());
                selfPlanItemRepository.save(item);
            } else if (period != null) {
                item.setEaten(false);
                item.setDietLogId(null);
                selfPlanItemRepository.save(item);
            }
        }
    }

    private void ensureCoachedYesterdayPlan(User coached, User pt, FoodItem food, LocalDate yesterday) {
        LocalDate weekStart = yesterday.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        MealPlan plan = ensurePublishedWeekPlan(coached, pt, weekStart);
        if (!hasPtPlanItemsForDay(plan.getId(), yesterday)) {
            seedPtDayItems(plan, food, yesterday, false);
        }
        mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId()).stream()
                .filter(i -> yesterday.equals(i.getPlanDate()))
                .filter(i -> i.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL)
                .forEach(item -> {
                    if (item.getMealPeriod() == MealPeriod.LATE) {
                        item.setEaten(false);
                        item.setLateTickReason(null);
                        mealPlanItemRepository.save(item);
                    } else if (item.getMealPeriod() == MealPeriod.MORNING) {
                        item.setEaten(false);
                        item.setLateTickReason(null);
                        mealPlanItemRepository.save(item);
                    }
                });
    }

    private void refreshTodayLateTickDemo(User user, FoodItem food, LocalDate today) {
        if (food == null) {
            return;
        }
        MealPeriod current = MealPeriods.current();
        boolean coached = COACHED_EMAIL.equalsIgnoreCase(user.getEmail());

        dietLogRepository.findByCustomerIdAndLogDate(user.getId(), today).stream()
                .filter(log -> log.getMealPeriod() != null
                        && log.getMealPeriod().ordinal() < current.ordinal()
                        && (!coached || log.getMealPeriod() != MealPeriod.AFTERNOON))
                .forEach(dietLogRepository::delete);

        if (!coached) {
            selfPlanItemRepository
                    .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(user.getId(), today)
                    .stream()
                    .filter(i -> i.getMealPeriod() != null && i.getMealPeriod().ordinal() < current.ordinal())
                    .forEach(item -> {
                        item.setEaten(false);
                        item.setDietLogId(null);
                        selfPlanItemRepository.save(item);
                    });
            for (MealPeriod period : MealPeriod.values()) {
                if (period.ordinal() < current.ordinal()
                        && !hasSelfPlanForPeriod(user.getId(), today, period)) {
                    saveSelf(user, food, today, period, false, null);
                }
            }
        } else {
            mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(user.getId()).stream()
                    .filter(p -> {
                        LocalDate start = p.getWeekStart();
                        if (start == null) return false;
                        LocalDate end = start.plusDays(6);
                        return !today.isBefore(start) && !today.isAfter(end);
                    })
                    .findFirst()
                    .ifPresent(plan -> mealPlanItemRepository
                            .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId()).stream()
                            .filter(i -> today.equals(i.getPlanDate()))
                            .filter(i -> i.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL)
                            .filter(i -> i.getMealPeriod() != null
                                    && i.getMealPeriod().ordinal() < current.ordinal()
                                    && i.getMealPeriod() != MealPeriod.AFTERNOON)
                            .forEach(item -> {
                                item.setEaten(false);
                                item.setLateTickReason(null);
                                mealPlanItemRepository.save(item);
                            }));
        }
        log.debug("Late-tick demo refreshed for {} on {}", user.getEmail(), today);
    }

    private FoodItem pickFood() {
        List<FoodItem> hits = foodItemRepository.searchByName("cơm");
        if (!hits.isEmpty()) return hits.get(0);
        hits = foodItemRepository.searchByName("pho");
        if (!hits.isEmpty()) return hits.get(0);
        List<FoodItem> all = foodItemRepository.findAll();
        return all.isEmpty() ? null : all.get(0);
    }

    private void seedGoals(User user, NutritionGoal goal, BigDecimal baseline, BigDecimal target) {
        clientGoalRepository.findByUserId(user.getId()).ifPresentOrElse(existing -> {
            existing.setNutritionGoal(goal);
            existing.setBaselineWeight(baseline);
            existing.setTargetWeight(target);
            existing.setTargetDate(DietDates.todayVn().plusMonths(2));
            clientGoalRepository.save(existing);
        }, () -> clientGoalRepository.save(ClientGoal.builder()
                .userId(user.getId())
                .nutritionGoal(goal)
                .baselineWeight(baseline)
                .targetWeight(target)
                .targetDate(DietDates.todayVn().plusMonths(2))
                .build()));
    }

    private void seedBodyMetrics(User user, LocalDate today, double startKg, double weeklyDelta) {
        for (int w = 4; w >= 0; w--) {
            LocalDate d = today.minusWeeks(w);
            if (bodyMetricRepository.findByUser_IdAndRecordDate(user.getId(), d).isPresent()) {
                continue;
            }
            double kg = startKg + weeklyDelta * (4 - w);
            bodyMetricRepository.save(BodyMetric.builder()
                    .user(user)
                    .recordDate(d)
                    .weight(BigDecimal.valueOf(kg).setScale(1, RoundingMode.HALF_UP))
                    .note(w == 0 ? "Cân hôm nay (demo fixture)" : "Cân tuần demo")
                    .build());
        }
    }

    private void seedHistoryLogs(User user, FoodItem food, LocalDate today, boolean withMakeupSample) {
        MealPeriod[] dayPeriods = {
                MealPeriod.MORNING, MealPeriod.NOON, MealPeriod.AFTERNOON, MealPeriod.EVENING
        };
        for (int daysAgo = 13; daysAgo >= 1; daysAgo--) {
            LocalDate logDate = today.minusDays(daysAgo);
            int count = 2 + (daysAgo % 3);
            for (int i = 0; i < count; i++) {
                MealPeriod period = dayPeriods[i % dayPeriods.length];
                if (daysAgo % 5 == 0 && i == count - 1) {
                    period = MealPeriod.LATE;
                }
                MealPeriod makeup = null;
                if (withMakeupSample && daysAgo == 3 && i == 1) {
                    makeup = MealPeriod.MORNING;
                    period = MealPeriod.NOON;
                } else if (!withMakeupSample && daysAgo == 2 && i == 1) {
                    makeup = MealPeriod.MORNING;
                    period = MealPeriod.AFTERNOON;
                }
                saveLog(user, food, logDate, period, makeup,
                        "Demo " + period.name() + " · ngày " + logDate);
            }
        }
        MealPeriod current = MealPeriods.current();
        for (MealPeriod period : dayPeriods) {
            if (period.ordinal() < current.ordinal()) {
                saveLog(user, food, today, period, null, "Demo hôm nay · " + period.name());
            }
        }
        if (withMakeupSample && current.ordinal() > MealPeriod.MORNING.ordinal()) {
            MealPeriod makeupHost = current.ordinal() > MealPeriod.NOON.ordinal()
                    ? MealPeriod.NOON : MealPeriod.AFTERNOON;
            if (makeupHost.ordinal() < current.ordinal()) {
                saveLog(user, food, today, makeupHost, MealPeriod.MORNING,
                        "Demo hôm nay có badge Bù sáng");
            }
        } else if (!withMakeupSample && current.ordinal() > MealPeriod.MORNING.ordinal()) {
            MealPeriod makeupHost = current.ordinal() > MealPeriod.NOON.ordinal()
                    ? MealPeriod.NOON : MealPeriod.AFTERNOON;
            if (makeupHost.ordinal() < current.ordinal()) {
                saveLog(user, food, today, makeupHost, MealPeriod.MORNING,
                        "Demo makeup sáng");
            }
        }
    }

    private void saveLog(User user, FoodItem food, LocalDate logDate, MealPeriod period,
                         MealPeriod makeup, String description) {
        BigDecimal qty = BigDecimal.valueOf(150 + (period.ordinal() * 20));
        MacroNutrients macros = scaleFood(food, qty);
        dietLogRepository.save(DietLog.builder()
                .customerId(user.getId())
                .mealType(MealPeriods.toMealType(period))
                .mealPeriod(period)
                .makeupForPeriod(makeup)
                .foodDescription(description + " — " + food.getNameVi())
                .foodItemId(food.getId())
                .logDate(logDate)
                .macrosJson(macros)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.NOT_REQUIRED)
                .mealSource(MealSource.HOME_COOKED)
                .recognitionSource(RecognitionSource.MANUAL)
                .build());
    }

    private void seedSoloPlans(User solo, FoodItem food, LocalDate today) {
        LocalDate yesterday = today.minusDays(1);
        LocalDate end = today.plusDays(14);
        for (LocalDate d = yesterday; !d.isAfter(end); d = d.plusDays(1)) {
            if (hasSelfPlanForDay(solo.getId(), d)) {
                continue;
            }
            boolean isYesterday = d.equals(yesterday);
            boolean isToday = d.equals(today);
            boolean fullDay = isToday || isYesterday || d.getDayOfWeek().getValue() <= 5;
            saveSelf(solo, food, d, MealPeriod.MORNING, isToday || isYesterday, null);
            saveSelf(solo, food, d, MealPeriod.NOON, false, null);
            if (fullDay) {
                saveSelf(solo, food, d, MealPeriod.AFTERNOON, false, null);
                saveSelf(solo, food, d, MealPeriod.EVENING, false, null);
                saveSelf(solo, food, d, MealPeriod.LATE, false, null);
            }
        }
        linkMorningSelfToLog(solo, today);
        linkMorningSelfToLog(solo, yesterday);
    }

    private void linkMorningSelfToLog(User solo, LocalDate day) {
        selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(solo.getId(), day)
                .stream()
                .filter(i -> i.getMealPeriod() == MealPeriod.MORNING && Boolean.TRUE.equals(i.getEaten()))
                .filter(i -> i.getDietLogId() == null)
                .findFirst()
                .ifPresent(morning -> dietLogRepository.findByCustomerIdAndLogDate(solo.getId(), day).stream()
                        .filter(l -> l.getMealPeriod() == MealPeriod.MORNING)
                        .findFirst()
                        .ifPresent(log -> {
                            morning.setDietLogId(log.getId());
                            selfPlanItemRepository.save(morning);
                        }));
    }

    private boolean hasSelfPlanForDay(java.util.UUID customerId, LocalDate day) {
        return !selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, day)
                .isEmpty();
    }

    private boolean hasSelfPlanForPeriod(java.util.UUID customerId, LocalDate day, MealPeriod period) {
        return selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, day)
                .stream()
                .anyMatch(i -> period.equals(i.getMealPeriod()));
    }


    private void cleanupDuplicateSelfItems(java.util.UUID customerId, LocalDate day, MealPeriod period) {
        List<SelfPlanItem> periodItems = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(customerId, day)
                .stream()
                .filter(i -> period.equals(i.getMealPeriod()))
                .toList();
        if (periodItems.size() <= 1) {
            return;
        }
        SelfPlanItem keep = periodItems.stream()
                .filter(i -> i.getSubmissionId() != null)
                .findFirst()
                .orElse(periodItems.get(periodItems.size() - 1));
        periodItems.stream()
                .filter(i -> !i.getId().equals(keep.getId()))
                .forEach(selfPlanItemRepository::delete);
    }

    private void seedCoachedPlans(User coached, User pt, FoodItem food, LocalDate today) {
        LocalDate horizonEnd = today.plusDays(14);
        LocalDate weekCursor = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        while (!weekCursor.isAfter(horizonEnd)) {
            LocalDate weekEnd = weekCursor.plusDays(6);
            if (!weekEnd.isBefore(today)) {
                MealPlan plan = ensurePublishedWeekPlan(coached, pt, weekCursor);
                LocalDate planFrom = today.minusDays(1);
                LocalDate dayStart = weekCursor.isBefore(planFrom) ? planFrom : weekCursor;
                LocalDate dayEnd = weekEnd.isAfter(horizonEnd) ? horizonEnd : weekEnd;
                for (LocalDate d = dayStart; !d.isAfter(dayEnd); d = d.plusDays(1)) {
                    if (!hasPtPlanItemsForDay(plan.getId(), d)) {
                        seedPtDayItems(plan, food, d, false);
                    }
                }
            }
            weekCursor = weekCursor.plusWeeks(1);
        }

        LocalDate approvedDay = today.minusDays(7);
        if (!selfPlanSubmissionRepository.existsByCustomerIdAndPlanDateAndStatus(
                coached.getId(), approvedDay, SelfPlanSubmissionStatus.APPROVED)) {
            SelfPlanSubmission approved = selfPlanSubmissionRepository.save(SelfPlanSubmission.builder()
                    .customerId(coached.getId())
                    .ptId(pt.getId())
                    .planDate(approvedDay)
                    .status(SelfPlanSubmissionStatus.APPROVED)
                    .submittedAt(LocalDateTime.now().minusDays(7).minusHours(2))
                    .decidedAt(LocalDateTime.now().minusDays(7))
                    .ptNote("OK — giữ món self")
                    .pendingUniqueKey(null)
                    .build());
            SelfPlanItem approvedItem = saveSelf(coached, food, approvedDay, MealPeriod.EVENING, true, null);
            approvedItem.setSubmissionId(approved.getId());
            approvedItem.setApplied(true);
            approvedItem.setLockedByReview(false);
            selfPlanItemRepository.save(approvedItem);
            MealPlan approvedWeekPlan = ensurePublishedWeekPlan(coached, pt,
                    approvedDay.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)));
            mealPlanItemRepository.save(MealPlanItem.builder()
                    .mealPlanId(approvedWeekPlan.getId())
                    .planDate(approvedDay)
                    .mealType(MealType.DINNER)
                    .mealPeriod(MealPeriod.EVENING)
                    .freeText("PT Demo — Cá hồi + rau")
                    .portionGrams(BigDecimal.valueOf(280))
                    .eaten(false)
                    .skipReason(MealPlanSkipReason.SUPERSEDED)
                    .skipNote("Thay bằng đề xuất học viên đã duyệt")
                    .sourceType(MealPlanItemSourceType.PT_ORIGINAL)
                    .foodItemId(food.getId())
                    .build());
            mealPlanItemRepository.save(MealPlanItem.builder()
                    .mealPlanId(approvedWeekPlan.getId())
                    .planDate(approvedDay)
                    .mealType(MealType.DINNER)
                    .mealPeriod(MealPeriod.EVENING)
                    .freeText("Self override · " + food.getNameVi())
                    .portionGrams(BigDecimal.valueOf(280))
                    .eaten(true)
                    .sourceType(MealPlanItemSourceType.SELF_OVERRIDE)
                    .foodItemId(food.getId())
                    .build());
        }

        LocalDate rejectedDay = today.minusDays(4);
        if (!selfPlanSubmissionRepository.existsByCustomerIdAndPlanDateAndStatus(
                coached.getId(), rejectedDay, SelfPlanSubmissionStatus.REJECTED)) {
            SelfPlanSubmission rejected = selfPlanSubmissionRepository.save(SelfPlanSubmission.builder()
                    .customerId(coached.getId())
                    .ptId(pt.getId())
                    .planDate(rejectedDay)
                    .status(SelfPlanSubmissionStatus.REJECTED)
                    .submittedAt(LocalDateTime.now().minusDays(4).minusHours(3))
                    .decidedAt(LocalDateTime.now().minusDays(4))
                    .ptNote("Từ chối demo: khẩu phần tối quá cao calo, chỉnh lại rồi gửi.")
                    .pendingUniqueKey(null)
                    .build());
            SelfPlanItem rejectedItem = saveSelf(coached, food, rejectedDay, MealPeriod.AFTERNOON, false, null);
            rejectedItem.setSubmissionId(rejected.getId());
            rejectedItem.setLockedByReview(false);
            rejectedItem.setApplied(false);
            selfPlanItemRepository.save(rejectedItem);
        }

        seedTodaySettledScenario(coached, pt, food, today);

        seedPendingSubmission(coached, pt, food, today.plusDays(1), MealPeriod.MORNING);
        seedPendingSubmission(coached, pt, food, today.plusDays(2), MealPeriod.EVENING);
    }

    private void seedTodaySettledScenario(User coached, User pt, FoodItem food, LocalDate today) {
        if (!hasSelfPlanForPeriod(coached.getId(), today, MealPeriod.AFTERNOON)) {
            saveSelf(coached, food, today, MealPeriod.AFTERNOON, false, null);
        }
        cleanupDuplicateSelfItems(coached.getId(), today, MealPeriod.EVENING);
        mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(coached.getId()).stream()
                .filter(p -> {
                    LocalDate start = p.getWeekStart();
                    if (start == null) return false;
                    LocalDate end = start.plusDays(6);
                    return !today.isBefore(start) && !today.isAfter(end);
                })
                .findFirst()
                .ifPresent(plan -> mealPlanItemRepository
                        .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId()).stream()
                        .filter(i -> today.equals(i.getPlanDate()) && i.getMealPeriod() == MealPeriod.AFTERNOON)
                        .filter(i -> i.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL)
                        .findFirst()
                        .ifPresent(item -> {
                            item.setEaten(true);
                            item.setLateTickReason("Demo: tick trễ buổi chiều");
                            mealPlanItemRepository.save(item);
                        }));
        mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(coached.getId()).stream()
                .filter(p -> {
                    LocalDate start = p.getWeekStart();
                    if (start == null) return false;
                    LocalDate end = start.plusDays(6);
                    return !today.isBefore(start) && !today.isAfter(end);
                })
                .findFirst()
                .ifPresent(plan -> mealPlanItemRepository
                        .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId()).stream()
                        .filter(i -> today.equals(i.getPlanDate()) && i.getMealPeriod() == MealPeriod.EVENING)
                        .filter(i -> i.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL)
                        .forEach(item -> {
                            item.setEaten(false);
                            item.setLateTickReason(null);
                            mealPlanItemRepository.save(item);
                        }));
        if (!selfPlanSubmissionRepository.existsByCustomerIdAndPlanDateAndStatus(
                coached.getId(), today, SelfPlanSubmissionStatus.PENDING)) {
            seedPendingSubmission(coached, pt, food, today, MealPeriod.EVENING);
        }
    }


    private void refreshTodayEveningReviewDemo(User coached, User pt, FoodItem food, LocalDate today) {
        if (!COACHED_EMAIL.equalsIgnoreCase(coached.getEmail())) {
            return;
        }
        dietLogRepository.findByCustomerIdAndLogDate(coached.getId(), today).stream()
                .filter(l -> l.getMealPeriod() == MealPeriod.EVENING)
                .forEach(dietLogRepository::delete);
        cleanupDuplicateSelfItems(coached.getId(), today, MealPeriod.EVENING);
        mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(coached.getId()).stream()
                .filter(p -> {
                    LocalDate start = p.getWeekStart();
                    if (start == null) return false;
                    LocalDate end = start.plusDays(6);
                    return !today.isBefore(start) && !today.isAfter(end);
                })
                .findFirst()
                .ifPresent(plan -> {
                    List<MealPlanItem> eveningPt = mealPlanItemRepository
                            .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId()).stream()
                            .filter(i -> today.equals(i.getPlanDate()) && i.getMealPeriod() == MealPeriod.EVENING)
                            .toList();
                    if (eveningPt.stream().anyMatch(i -> i.getSourceType() == MealPlanItemSourceType.SELF_OVERRIDE)) {
                        return;
                    }
                    eveningPt.stream()
                            .filter(i -> i.getSourceType() == null
                                    || i.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL)
                            .forEach(item -> {
                                item.setEaten(false);
                                item.setSkipReason(null);
                                item.setSkipNote(null);
                                item.setLateTickReason(null);
                                mealPlanItemRepository.save(item);
                            });
                });
        SelfPlanSubmission pending = selfPlanSubmissionRepository.findByCustomerIdAndPlanDate(coached.getId(), today)
                .stream()
                .filter(s -> s.getStatus() == SelfPlanSubmissionStatus.PENDING)
                .findFirst()
                .orElse(null);
        if (pending == null) {
            seedPendingSubmission(coached, pt, food, today, MealPeriod.EVENING);
            return;
        }
        selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(coached.getId(), today)
                .stream()
                .filter(i -> i.getMealPeriod() == MealPeriod.EVENING)
                .filter(i -> !Boolean.TRUE.equals(i.getApplied()))
                .findFirst()
                .ifPresent(item -> {
                    item.setSubmissionId(pending.getId());
                    item.setLockedByReview(true);
                    item.setApplied(false);
                    selfPlanItemRepository.save(item);
                });
    }

    private MealPlan ensurePublishedWeekPlan(User coached, User pt, LocalDate weekStart) {
        MealPlan plan = mealPlanRepository
                .findFirstByClientIdAndWeekStartOrderByCreatedAtDesc(coached.getId(), weekStart)
                .orElseGet(() -> mealPlanRepository.save(MealPlan.builder()
                        .clientId(coached.getId())
                        .ptId(pt.getId())
                        .weekStart(weekStart)
                        .notes("Demo veteran week — 5 buổi + mealPeriod")
                        .isPublished(false)
                        .build()));
        plan.setIsPublished(true);
        plan.setNotes("Demo veteran week — published");
        return mealPlanRepository.save(plan);
    }

    private boolean hasPtPlanItemsForDay(java.util.UUID planId, LocalDate day) {
        return mealPlanItemRepository.findByMealPlanIdOrderByPlanDateAscMealTypeAsc(planId).stream()
                .anyMatch(i -> day.equals(i.getPlanDate()));
    }

    private void seedPendingSubmission(User coached, User pt, FoodItem food,
                                       LocalDate planDate, MealPeriod period) {
        if (selfPlanSubmissionRepository.existsByCustomerIdAndPlanDateAndStatus(
                coached.getId(), planDate, SelfPlanSubmissionStatus.PENDING)) {
            return;
        }
        SelfPlanSubmission pending = selfPlanSubmissionRepository.save(SelfPlanSubmission.builder()
                .customerId(coached.getId())
                .ptId(pt.getId())
                .planDate(planDate)
                .status(SelfPlanSubmissionStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .pendingUniqueKey(coached.getId() + "|" + planDate)
                .build());
        SelfPlanItem item = selfPlanItemRepository
                .findByCustomerIdAndPlanDateOrderByMealTypeAscCreatedAtAsc(coached.getId(), planDate)
                .stream()
                .filter(i -> period.equals(i.getMealPeriod()))
                .filter(i -> i.getSubmissionId() == null)
                .findFirst()
                .orElseGet(() -> saveSelf(coached, food, planDate, period, false, null));
        item.setSubmissionId(pending.getId());
        item.setLockedByReview(true);
        item.setApplied(false);
        selfPlanItemRepository.save(item);
    }

    private void seedPtDayItems(MealPlan plan, FoodItem food, LocalDate day, boolean morningOnly) {
        record Row(MealPeriod period, String name) {}
        List<Row> rows = morningOnly
                ? List.of(new Row(MealPeriod.MORNING, "PT Demo — Bữa sáng ngày mai"))
                : List.of(
                new Row(MealPeriod.MORNING, "PT Demo — Cháo yến mạch"),
                new Row(MealPeriod.NOON, "PT Demo — Cơm gà"),
                new Row(MealPeriod.AFTERNOON, "PT Demo — Sữa chua"),
                new Row(MealPeriod.EVENING, "PT Demo — Cá hồi + rau"),
                new Row(MealPeriod.LATE, "PT Demo — Casein đêm")
        );
        MealPlan clientPlan = mealPlanRepository.findById(plan.getId()).orElse(plan);
        User coached = userRepository.findById(clientPlan.getClientId()).orElse(null);
        int dailyCal = resolveDailyCalories(coached);
        for (Row row : rows) {
            int mealCal = mealCalTarget(dailyCal, row.period());
            BigDecimal grams = gramsForCalories(food, mealCal);
            mealPlanItemRepository.save(MealPlanItem.builder()
                    .mealPlanId(plan.getId())
                    .planDate(day)
                    .mealType(MealPeriods.toMealType(row.period()))
                    .mealPeriod(row.period())
                    .freeText(row.name())
                    .portionGrams(grams)
                    .eaten(false)
                    .sourceType(MealPlanItemSourceType.PT_ORIGINAL)
                    .foodItemId(food.getId())
                    .foodCode(food.getFoodCode())
                    .build());
        }
    }

    private void rescaleCoachedPtPlanPortions(User coached, FoodItem food) {
        if (coached == null || food == null || food.getCalories() == null) {
            return;
        }
        int dailyCal = resolveDailyCalories(coached);
        LocalDate today = DietDates.todayVn();
        LocalDate end = today.plusDays(14);
        mealPlanRepository.findByClientIdAndIsPublishedTrueOrderByWeekStartDesc(coached.getId())
                .forEach(plan -> mealPlanItemRepository
                        .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId())
                        .stream()
                        .filter(i -> i.getSourceType() == MealPlanItemSourceType.PT_ORIGINAL)
                        .filter(i -> i.getPlanDate() != null
                                && !i.getPlanDate().isBefore(today.minusDays(1))
                                && !i.getPlanDate().isAfter(end))
                        .forEach(item -> {
                            MealPeriod period = item.getMealPeriod() != null
                                    ? item.getMealPeriod() : MealPeriod.MORNING;
                            int mealCal = mealCalTarget(dailyCal, period);
                            item.setPortionGrams(gramsForCalories(food, mealCal));
                            mealPlanItemRepository.save(item);
                        }));
        log.debug("Rescaled PT plan portions for {} — target {} kcal/day", coached.getEmail(), dailyCal);
    }

    private int resolveDailyCalories(User coached) {
        return macroTargetRepository.findByUserId(coached.getId())
                .map(MacroTarget::getDailyCalories)
                .map(BigDecimal::intValue)
                .filter(v -> v > 0)
                .orElse(1850);
    }

    private int mealCalTarget(int dailyCal, MealPeriod period) {
        int idx = period != null ? period.ordinal() : 0;
        if (idx < 0 || idx >= MEAL_CAL_SHARE.length) {
            idx = 0;
        }
        return Math.max(80, (int) Math.round(dailyCal * MEAL_CAL_SHARE[idx]));
    }

    private BigDecimal gramsForCalories(FoodItem food, int targetCal) {
        BigDecimal serving = food.getServingSizeG() != null
                && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);
        BigDecimal calPerServing = food.getCalories().compareTo(BigDecimal.ZERO) > 0
                ? food.getCalories() : BigDecimal.valueOf(130);
        BigDecimal ratio = BigDecimal.valueOf(targetCal).divide(calPerServing, 4, RoundingMode.HALF_UP);
        return serving.multiply(ratio).setScale(0, RoundingMode.HALF_UP);
    }

    private SelfPlanItem saveSelf(User user, FoodItem food, LocalDate planDate,
                                  MealPeriod period, boolean eaten, java.util.UUID dietLogId) {
        BigDecimal qty = BigDecimal.valueOf(160 + period.ordinal() * 15);
        MacroNutrients macros = scaleFood(food, qty);
        return selfPlanItemRepository.save(SelfPlanItem.builder()
                .customerId(user.getId())
                .planDate(planDate)
                .mealType(MealPeriods.toMealType(period))
                .mealPeriod(period)
                .foodItemId(food.getId())
                .itemName(food.getNameVi())
                .quantityG(qty)
                .calories(macros.calories())
                .protein(macros.protein())
                .carb(macros.carbs())
                .fat(macros.fat())
                .eaten(eaten)
                .dietLogId(dietLogId)
                .lockedByReview(false)
                .applied(false)
                .build());
    }

    private static MacroNutrients scaleFood(FoodItem food, BigDecimal qty) {
        BigDecimal serving = food.getServingSizeG() != null
                && food.getServingSizeG().compareTo(BigDecimal.ZERO) > 0
                ? food.getServingSizeG() : BigDecimal.valueOf(100);
        BigDecimal ratio = qty.divide(serving, 4, RoundingMode.HALF_UP);
        return MacroNutrients.of(
                scale(food.getCalories(), ratio),
                scale(food.getProtein(), ratio),
                scale(food.getCarb(), ratio),
                scale(food.getFat(), ratio));
    }

    private static BigDecimal scale(BigDecimal perServing, BigDecimal ratio) {
        if (perServing == null) return BigDecimal.ZERO;
        return perServing.multiply(ratio).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP);
    }
}
