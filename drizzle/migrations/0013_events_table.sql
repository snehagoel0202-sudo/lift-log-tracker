CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (name IN ('signed_up','onboarding_completed','postpartum_mode_on','checkin_saved','log_reviewed','log_corrected','log_saved','plan_generated')),
  props jsonb CHECK (props IS NULL OR (jsonb_typeof(props) = 'object' AND pg_column_size(props) <= 1024)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_name_created_idx ON public.events (name, created_at);
GRANT INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can record their own events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.delete_account_permanently(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'missing user';
  END IF;
  DELETE FROM public.workout_sets WHERE user_id = _user_id;
  DELETE FROM public.workout_sessions WHERE user_id = _user_id;
  DELETE FROM public.plan_items WHERE user_id = _user_id;
  DELETE FROM public.plans WHERE user_id = _user_id;
  DELETE FROM public.checkins WHERE user_id = _user_id;
  DELETE FROM public.events WHERE user_id = _user_id;
  DELETE FROM public.feedback WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  INSERT INTO public.account_deletions_daily (day, deletions)
  VALUES (current_date, 1)
  ON CONFLICT (day) DO UPDATE SET deletions = public.account_deletions_daily.deletions + 1;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_account_permanently(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_permanently(uuid) TO service_role;