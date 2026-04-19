-- Add skin_assessment and zone_scores columns to scan_sessions
ALTER TABLE scan_sessions
  ADD COLUMN IF NOT EXISTS zone_scores      JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skin_assessment  JSONB DEFAULT NULL;
