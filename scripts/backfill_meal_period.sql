-- One-shot backfill: meal_period on self_plan_items / meal_plan_items / diet_logs.
-- Hibernate ddl-auto=update adds nullable columns; run this after deploy.
-- SNACK stays NULL when AFTERNOON vs LATE cannot be inferred (tick blocked until re-saved).

-- Unambiguous meal_type → meal_period
UPDATE self_plan_items
SET meal_period = 'MORNING'
WHERE meal_period IS NULL AND meal_type = 'BREAKFAST';

UPDATE self_plan_items
SET meal_period = 'NOON'
WHERE meal_period IS NULL AND meal_type = 'LUNCH';

UPDATE self_plan_items
SET meal_period = 'EVENING'
WHERE meal_period IS NULL AND meal_type = 'DINNER';

UPDATE meal_plan_items
SET meal_period = 'MORNING'
WHERE meal_period IS NULL AND meal_type = 'BREAKFAST';

UPDATE meal_plan_items
SET meal_period = 'NOON'
WHERE meal_period IS NULL AND meal_type = 'LUNCH';

UPDATE meal_plan_items
SET meal_period = 'EVENING'
WHERE meal_period IS NULL AND meal_type = 'DINNER';

UPDATE diet_logs
SET meal_period = 'MORNING'
WHERE meal_period IS NULL AND meal_type = 'BREAKFAST';

UPDATE diet_logs
SET meal_period = 'NOON'
WHERE meal_period IS NULL AND meal_type = 'LUNCH';

UPDATE diet_logs
SET meal_period = 'EVENING'
WHERE meal_period IS NULL AND meal_type = 'DINNER';

-- Diet logs linked from self_plan_items
UPDATE diet_logs dl
SET meal_period = spi.meal_period
FROM self_plan_items spi
WHERE spi.diet_log_id = dl.id
  AND dl.meal_period IS NULL
  AND spi.meal_period IS NOT NULL;

-- makeup_for_period: leave NULL (no backfill)
