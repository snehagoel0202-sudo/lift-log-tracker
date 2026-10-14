CREATE TABLE public.account_deletions_daily (
  day date PRIMARY KEY,
  deletions integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.account_deletions_daily TO service_role;
ALTER TABLE public.account_deletions_daily ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_deletions_daily IS 'Anonymous count of account deletions per day. No user ids or emails.';

-- The ONE exception to the soft-delete rule: a user permanently deleting their own account.
-- Runs as a single transaction: data rows, then the auth user. Any failure rolls everything back.
CREATE OR REPLACE FUNCTION public.delete_account_permanently(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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