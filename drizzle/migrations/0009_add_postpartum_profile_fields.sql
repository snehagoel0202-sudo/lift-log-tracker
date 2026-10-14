CREATE TYPE public.birth_type AS ENUM ('vaginal', 'c_section', 'prefer_not_to_say');
ALTER TABLE public.profiles
  ADD COLUMN postpartum boolean NOT NULL DEFAULT false,
  ADD COLUMN postpartum_weeks_since_birth smallint,
  ADD COLUMN postpartum_weeks_recorded_on date,
  ADD COLUMN postpartum_birth_type public.birth_type,
  ADD COLUMN postpartum_cleared boolean,
  ADD COLUMN postpartum_cleared_on date,
  ADD CONSTRAINT profiles_postpartum_weeks_range CHECK (postpartum_weeks_since_birth IS NULL OR postpartum_weeks_since_birth BETWEEN 0 AND 520);
COMMENT ON COLUMN public.profiles.postpartum_weeks_since_birth IS 'Weeks since birth as of postpartum_weeks_recorded_on (local date).';
COMMENT ON COLUMN public.profiles.postpartum_cleared_on IS 'Local date the user reported medical clearance.';