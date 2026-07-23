-- Unique weekly summary per PT + client + coaching week start (manual / doc; Flyway not enabled).
CREATE UNIQUE INDEX IF NOT EXISTS uk_weekly_summary_pt_client_week
    ON weekly_summaries (pt_id, client_id, week_start_date);
