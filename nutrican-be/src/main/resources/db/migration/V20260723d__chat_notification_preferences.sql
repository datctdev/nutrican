-- Per-conversation notification preferences. Muting suppresses toast/bell
-- notifications only; chat messages are still delivered and remain unread.
ALTER TABLE pt_client_mappings
  ADD COLUMN IF NOT EXISTS pt_chat_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_chat_notifications_enabled boolean NOT NULL DEFAULT true;
