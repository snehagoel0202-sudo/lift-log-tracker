DO $$ BEGIN
  CREATE TYPE public.training_goal AS ENUM ('strength', 'build_muscle', 'lose_fat', 'general_fitness');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.experience_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_access AS ENUM ('full_gym', 'dumbbells_only', 'bodyweight_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal public.training_goal,
  ADD COLUMN IF NOT EXISTS experience public.experience_level,
  ADD COLUMN IF NOT EXISTS days_per_week SMALLINT,
  ADD COLUMN IF NOT EXISTS session_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS equipment public.equipment_access,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_days_per_week_range CHECK (days_per_week IS NULL OR (days_per_week BETWEEN 2 AND 6)),
  ADD CONSTRAINT profiles_session_minutes_range CHECK (session_minutes IS NULL OR (session_minutes BETWEEN 15 AND 180));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
