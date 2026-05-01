ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_persona TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_steps_done JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
  ON public.profiles(onboarding_completed_at)
  WHERE onboarding_completed_at IS NULL;