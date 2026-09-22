CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  sleep smallint,
  energy smallint,
  soreness smallint,
  pain boolean NOT NULL DEFAULT false,
  pain_area text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date),
  CONSTRAINT checkins_sleep_range CHECK (sleep IS NULL OR (sleep BETWEEN 1 AND 5)),
  CONSTRAINT checkins_energy_range CHECK (energy IS NULL OR (energy BETWEEN 1 AND 5)),
  CONSTRAINT checkins_soreness_range CHECK (soreness IS NULL OR (soreness BETWEEN 1 AND 5))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checkins" ON public.checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own checkins" ON public.checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checkins" ON public.checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own checkins" ON public.checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER checkins_set_updated_at BEFORE UPDATE ON public.checkins
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
