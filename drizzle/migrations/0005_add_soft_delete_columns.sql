ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.plan_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS workout_sessions_user_live_idx ON public.workout_sessions (user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS workout_sets_user_live_idx ON public.workout_sets (user_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS checkins_user_live_idx ON public.checkins (user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS plans_user_live_idx ON public.plans (user_id, status) WHERE deleted_at IS NULL;