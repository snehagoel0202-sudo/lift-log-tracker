-- Add a plain dumbbell bicep curl (missing from the library) and dictation aliases.
INSERT INTO public.exercises (name, aliases, muscle_group, equipment, is_compound, weight_step, impact_level, postpartum_safe)
VALUES
  ('Dumbbell Bicep Curl', ARRAY['bicep curl','bicep curls','bicep curves','biceps curl','biceps curls','dumbbell curl','dumbbell curls','curls'], 'arms', 'dumbbell', false, 2, 'low', true),
  ('Cable Bicep Curl', ARRAY['cable curl','cable curls','cable bicep curls'], 'arms', 'cable', false, 2.5, 'low', true)
ON CONFLICT (name) DO NOTHING;

UPDATE public.exercises
SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['barbell curls','ez bar curl'])))
WHERE name = 'Barbell Curl';

UPDATE public.exercises
SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['dumbbell bench','dumbbell chest press','dumbbell press'])))
WHERE name = 'Dumbbell Bench Press';

UPDATE public.exercises
SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['lunges','lunge','dumbbell lunges'])))
WHERE name = 'Dumbbell Lunge';

UPDATE public.exercises
SET aliases = (SELECT ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['dumbbell shoulder press','shoulder press','dumbbell overhead press'])))
WHERE name = 'Dumbbell Shoulder Press';