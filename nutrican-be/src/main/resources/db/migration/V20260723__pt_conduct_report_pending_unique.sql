-- At most one PENDING conduct report per mapping+customer (manual / doc; Flyway may not auto-run).
CREATE UNIQUE INDEX IF NOT EXISTS uk_pt_conduct_pending_mapping_customer
  ON pt_conduct_reports (mapping_id, customer_id)
  WHERE status = 'PENDING';
