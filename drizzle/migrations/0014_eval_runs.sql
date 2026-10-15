CREATE TABLE public.eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  model text NOT NULL,
  overall_pass integer NOT NULL,
  overall_total integer NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb
);
REVOKE ALL ON public.eval_runs FROM anon, authenticated;
GRANT ALL ON public.eval_runs TO service_role;
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;