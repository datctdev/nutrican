-- Report lifecycle: user suspend until + report false_report / suspend_until snapshot
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended_until timestamp;

ALTER TABLE pt_conduct_reports
  ADD COLUMN IF NOT EXISTS false_report boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspend_until timestamp;
