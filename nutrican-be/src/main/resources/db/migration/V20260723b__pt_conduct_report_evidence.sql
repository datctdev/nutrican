-- Evidence images + suspend flag for PT conduct reports (manual / doc; Flyway may not auto-run).
ALTER TABLE pt_conduct_reports
  ADD COLUMN IF NOT EXISTS evidence_object_names jsonb,
  ADD COLUMN IF NOT EXISTS pt_suspended boolean NOT NULL DEFAULT false;
