CREATE TYPE public.plan_status AS ENUM ('draft', 'approved', 'archived');

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  status public.plan_status NOT NULL DEFAULT 'draft',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans" ON public.plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON public.plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX plans_user_status_idx ON public.plans (user_id, status);

CREATE TABLE public.plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  day_number smallint NOT NULL,
  position smallint NOT NULL DEFAULT 1,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id),
  sets smallint NOT NULL,
  rep_min smallint NOT NULL,
  rep_max smallint NOT NULL,
  target_weight numeric(6,2),
  unit public.weight_unit NOT NULL DEFAULT 'kg',
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_items_day_positive CHECK (day_number > 0),
  CONSTRAINT plan_items_sets_positive CHECK (sets > 0),
  CONSTRAINT plan_items_reps_valid CHECK (rep_min > 0 AND rep_max >= rep_min)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_items TO authenticated;
GRANT ALL ON public.plan_items TO service_role;

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan items" ON public.plan_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plan items" ON public.plan_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan items" ON public.plan_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan items" ON public.plan_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX plan_items_plan_idx ON public.plan_items (plan_id, day_number, position);
