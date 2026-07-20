-- Local one-shot backfill: PENDING diet logs without an ACTIVE PT mapping → NOT_REQUIRED.
-- Run AFTER BE fix is deployed/restarted. Idempotent — safe to re-run.
-- Verify columns first: \d diet_logs / \d pt_client_mappings

UPDATE diet_logs dl
SET review_status = 'NOT_REQUIRED'
WHERE dl.review_status = 'PENDING'
  AND NOT EXISTS (
    SELECT 1 FROM pt_client_mappings m
    WHERE m.client_id = dl.customer_id
      AND m.status = 'ACTIVE'
  );
