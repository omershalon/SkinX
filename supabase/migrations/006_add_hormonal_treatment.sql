-- Capture hormonal treatment / birth control during onboarding so the plan
-- generator can factor it into recommendations (especially for hormonal acne).
ALTER TABLE public.onboarding_data
  ADD COLUMN IF NOT EXISTS hormonal_treatment TEXT[] NOT NULL DEFAULT '{}';
