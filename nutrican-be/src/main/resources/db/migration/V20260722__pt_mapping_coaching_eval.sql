-- Additive coaching evaluation columns on pt_client_mappings (manual / doc; Flyway not enabled).
ALTER TABLE pt_client_mappings ADD COLUMN IF NOT EXISTS coaching_status VARCHAR(20);
ALTER TABLE pt_client_mappings ADD COLUMN IF NOT EXISTS coaching_evaluation VARCHAR(20);
ALTER TABLE pt_client_mappings ADD COLUMN IF NOT EXISTS coaching_eval_note VARCHAR(500);
ALTER TABLE pt_client_mappings ADD COLUMN IF NOT EXISTS coaching_eval_updated_at TIMESTAMP;
