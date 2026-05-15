-- Today's Plan UI redesign: AI now returns a richer plan shape.
-- skin_goal:    { headline, description, tags: [{label, kind}] }
-- avoid_today:  string[]  (3 short don'ts shown in the "Avoid today" card)
-- coach_note:   string    (1–2 sentence encouragement shown in the "Coach note" card)
ALTER TABLE public.personalized_plans
  ADD COLUMN IF NOT EXISTS skin_goal   JSONB,
  ADD COLUMN IF NOT EXISTS avoid_today JSONB,
  ADD COLUMN IF NOT EXISTS coach_note  TEXT;
