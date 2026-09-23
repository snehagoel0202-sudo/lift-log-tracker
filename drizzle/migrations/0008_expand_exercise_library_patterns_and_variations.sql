-- 1. New enum + columns (no existing rows deleted or recreated)
DO $$ BEGIN
  CREATE TYPE public.movement_pattern AS ENUM ('squat','hinge','push','pull','lunge','carry','core');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS movement_pattern public.movement_pattern,
  ADD COLUMN IF NOT EXISTS variation_of uuid REFERENCES public.exercises(id) ON DELETE SET NULL;

-- 2. Backfill movement_pattern for existing rows
UPDATE public.exercises SET movement_pattern = 'squat' WHERE name IN (
  'Back Squat','Barbell Sumo Squat','Bodyweight Squat','Box Squat','Dumbbell Squat','Dumbbell Sumo Squat',
  'Front Squat','Goblet Squat','Hack Squat Machine','Leg Press','Wall Sit','Leg Extension',
  'Standing Calf Raise','Seated Calf Raise');

UPDATE public.exercises SET movement_pattern = 'hinge' WHERE name IN (
  'Deadlift','Sumo Deadlift','Trap Bar Deadlift','Romanian Deadlift','Dumbbell Romanian Deadlift',
  'Barbell Hip Thrust','Glute Bridge','Cable Glute Kickback','Lying Leg Curl','Seated Leg Curl');

UPDATE public.exercises SET movement_pattern = 'push' WHERE name IN (
  'Barbell Bench Press','Incline Barbell Bench Press','Decline Barbell Bench Press','Close-Grip Bench Press',
  'Dumbbell Bench Press','Incline Dumbbell Bench Press','Chest Press Machine','Pec Deck Machine',
  'Cable Chest Fly','Dumbbell Chest Fly','Push-Up','Incline Push-Up','Overhead Press',
  'Dumbbell Shoulder Press','Seated Dumbbell Shoulder Press','Machine Shoulder Press','Arnold Press',
  'Dumbbell Lateral Raise','Cable Lateral Raise','Parallel Bar Dip','Bench Dip','Cable Triceps Pushdown',
  'Barbell Skull Crusher','Overhead Dumbbell Triceps Extension','Cable Rope Overhead Triceps Extension');

UPDATE public.exercises SET movement_pattern = 'pull' WHERE name IN (
  'Barbell Row','Single-Arm Dumbbell Row','Chest-Supported Machine Row','T-Bar Row','Seated Cable Row',
  'Inverted Row','Band Row','Lat Pulldown','Straight-Arm Cable Pulldown','Pull-Up','Chin-Up','Face Pull',
  'Barbell Upright Row','Dumbbell Rear Delt Fly','Barbell Shrug','Dumbbell Shrug','Barbell Curl',
  'Dumbbell Bicep Curl','Dumbbell Hammer Curl','Incline Dumbbell Curl','Cable Bicep Curl',
  'Machine Preacher Curl','Barbell Reverse Curl');

UPDATE public.exercises SET movement_pattern = 'lunge' WHERE name IN (
  'Dumbbell Lunge','Dumbbell Walking Lunge','Bodyweight Reverse Lunge','Dumbbell Step-Up',
  'Bodyweight Box Step-Up','Dumbbell Bulgarian Split Squat');

UPDATE public.exercises SET movement_pattern = 'core' WHERE name IN (
  'Plank','Side Plank','Dead Bug','Bird Dog','Hollow Hold','Russian Twist','Hanging Leg Raise',
  'Cable Crunch','Cable Pallof Press');

-- 3. Link existing variations to their base exercise
UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Back Squat' AND v.name IN (
  'Front Squat','Goblet Squat','Dumbbell Squat','Barbell Sumo Squat','Dumbbell Sumo Squat',
  'Box Squat','Hack Squat Machine','Leg Press','Bodyweight Squat','Dumbbell Bulgarian Split Squat');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Deadlift' AND v.name IN (
  'Sumo Deadlift','Trap Bar Deadlift','Romanian Deadlift','Dumbbell Romanian Deadlift');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Barbell Bench Press' AND v.name IN (
  'Incline Barbell Bench Press','Decline Barbell Bench Press','Close-Grip Bench Press',
  'Dumbbell Bench Press','Incline Dumbbell Bench Press','Chest Press Machine');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Barbell Row' AND v.name IN (
  'Single-Arm Dumbbell Row','Chest-Supported Machine Row','T-Bar Row','Seated Cable Row','Inverted Row','Band Row');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Overhead Press' AND v.name IN (
  'Dumbbell Shoulder Press','Seated Dumbbell Shoulder Press','Machine Shoulder Press','Arnold Press');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Dumbbell Lunge' AND v.name IN (
  'Dumbbell Walking Lunge','Bodyweight Reverse Lunge','Dumbbell Step-Up','Bodyweight Box Step-Up');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Dumbbell Bicep Curl' AND v.name IN (
  'Barbell Curl','Dumbbell Hammer Curl','Incline Dumbbell Curl','Cable Bicep Curl',
  'Machine Preacher Curl','Barbell Reverse Curl');

UPDATE public.exercises v SET variation_of = b.id
FROM public.exercises b
WHERE b.name = 'Pull-Up' AND v.name = 'Chin-Up';

-- 4. Remove ambiguous aliases so defaults are unambiguous
UPDATE public.exercises SET aliases = array_remove(aliases, 'bicep curl') WHERE name = 'Barbell Curl';
UPDATE public.exercises SET aliases = array_remove(aliases, 'leg curl') WHERE name = 'Seated Leg Curl';

-- 5. New exercises
INSERT INTO public.exercises
  (name, aliases, muscle_group, equipment, is_compound, weight_step, impact_level, postpartum_safe, movement_pattern)
VALUES
  -- Squat
  ('Smith Machine Squat', ARRAY['smith squat','smith machine squats'], 'Legs', 'machine', true, 5, 'moderate', true, 'squat'),
  ('Zercher Squat', ARRAY['zercher squats'], 'Legs', 'barbell', true, 2.5, 'moderate', false, 'squat'),
  ('Landmine Squat', ARRAY['landmine squats','landmine goblet squat'], 'Legs', 'barbell', true, 2.5, 'low', true, 'squat'),
  ('Barbell Split Squat', ARRAY['barbell split squats'], 'Legs', 'barbell', true, 2.5, 'moderate', false, 'squat'),
  ('Dumbbell Split Squat', ARRAY['dumbbell split squats','db split squat'], 'Legs', 'dumbbell', true, 2, 'low', true, 'squat'),
  ('Single-Leg Leg Press', ARRAY['one leg leg press','single leg press'], 'Legs', 'machine', true, 5, 'low', true, 'squat'),
  -- Hinge
  ('Stiff-Leg Deadlift', ARRAY['stiff leg deadlift','straight leg deadlift'], 'Legs', 'barbell', true, 2.5, 'moderate', false, 'hinge'),
  ('Good Morning', ARRAY['good mornings'], 'Legs', 'barbell', true, 2.5, 'moderate', false, 'hinge'),
  ('Single-Leg Romanian Deadlift', ARRAY['single leg rdl','one leg rdl'], 'Legs', 'dumbbell', true, 2, 'low', true, 'hinge'),
  ('Cable Pull-Through', ARRAY['pull through','cable pull throughs'], 'Legs', 'cable', false, 5, 'low', true, 'hinge'),
  ('Back Extension', ARRAY['back extensions','hyperextension'], 'Back', 'bodyweight', false, 0, 'low', true, 'hinge'),
  ('Dumbbell Swing', ARRAY['dumbbell swings','kettlebell swing','kettlebell swings'], 'Legs', 'dumbbell', true, 2, 'high', false, 'hinge'),
  -- Push
  ('Machine Incline Chest Press', ARRAY['incline machine press','incline chest press machine'], 'Chest', 'machine', true, 5, 'low', true, 'push'),
  ('Smith Machine Bench Press', ARRAY['smith bench press'], 'Chest', 'machine', true, 5, 'low', true, 'push'),
  ('Seated Barbell Overhead Press', ARRAY['seated barbell press','seated military press'], 'Shoulders', 'barbell', true, 2.5, 'low', true, 'push'),
  ('Landmine Press', ARRAY['landmine presses','single arm landmine press'], 'Shoulders', 'barbell', true, 2.5, 'low', true, 'push'),
  ('Cable Chest Press', ARRAY['cable press','standing cable chest press'], 'Chest', 'cable', true, 5, 'low', true, 'push'),
  ('Pike Push-Up', ARRAY['pike push up','pike pushups'], 'Shoulders', 'bodyweight', true, 0, 'moderate', false, 'push'),
  ('Diamond Push-Up', ARRAY['diamond push up','close grip pushup'], 'Arms', 'bodyweight', false, 0, 'moderate', false, 'push'),
  -- Pull
  ('Wide-Grip Lat Pulldown', ARRAY['wide grip pulldown'], 'Back', 'cable', true, 5, 'low', true, 'pull'),
  ('Close-Grip Lat Pulldown', ARRAY['close grip pulldown','neutral grip pulldown'], 'Back', 'cable', true, 5, 'low', true, 'pull'),
  ('Pendlay Row', ARRAY['pendlay rows','dead stop row'], 'Back', 'barbell', true, 2.5, 'high', false, 'pull'),
  ('Assisted Pull-Up Machine', ARRAY['assisted pull up','assisted pullups'], 'Back', 'machine', true, 5, 'low', true, 'pull'),
  ('Single-Arm Cable Row', ARRAY['one arm cable row','single arm seated row'], 'Back', 'cable', true, 2.5, 'low', true, 'pull'),
  ('Meadows Row', ARRAY['meadows rows','landmine row'], 'Back', 'barbell', true, 2.5, 'moderate', false, 'pull'),
  -- Lunge
  ('Barbell Walking Lunge', ARRAY['barbell walking lunges','barbell lunge'], 'Legs', 'barbell', true, 2.5, 'moderate', false, 'lunge'),
  ('Dumbbell Lateral Lunge', ARRAY['lateral lunge','side lunge','side lunges'], 'Legs', 'dumbbell', true, 2, 'low', true, 'lunge'),
  ('Bodyweight Forward Lunge', ARRAY['forward lunge','bodyweight lunges'], 'Legs', 'bodyweight', true, 0, 'moderate', true, 'lunge'),
  ('Dumbbell Curtsy Lunge', ARRAY['curtsy lunge','curtsy lunges'], 'Legs', 'dumbbell', true, 2, 'low', true, 'lunge'),
  -- Arms
  ('Dumbbell Concentration Curl', ARRAY['concentration curl','concentration curls'], 'Arms', 'dumbbell', false, 2, 'low', true, 'pull'),
  ('Zottman Curl', ARRAY['zottman curls'], 'Arms', 'dumbbell', false, 2, 'low', true, 'pull'),
  ('Cable Rope Hammer Curl', ARRAY['rope hammer curl','rope curl'], 'Arms', 'cable', false, 2.5, 'low', true, 'pull'),
  ('Dumbbell Triceps Kickback', ARRAY['tricep kickback','triceps kickbacks'], 'Arms', 'dumbbell', false, 2, 'low', true, 'push'),
  -- Core / carry
  ('Ab Wheel Rollout', ARRAY['ab rollout','ab wheel'], 'Core', 'bodyweight', false, 0, 'moderate', false, 'core'),
  ('Bicycle Crunch', ARRAY['bicycle crunches'], 'Core', 'bodyweight', false, 0, 'low', false, 'core'),
  ('Reverse Crunch', ARRAY['reverse crunches'], 'Core', 'bodyweight', false, 0, 'low', false, 'core'),
  ('Cable Woodchop', ARRAY['woodchop','cable woodchopper'], 'Core', 'cable', false, 2.5, 'low', true, 'core'),
  ('Dumbbell Farmer Carry', ARRAY['farmer carry','farmers walk','farmer walk'], 'Core', 'dumbbell', true, 2, 'low', true, 'carry'),
  ('Dumbbell Suitcase Carry', ARRAY['suitcase carry','single arm carry'], 'Core', 'dumbbell', true, 2, 'low', true, 'carry')
ON CONFLICT DO NOTHING;

-- 6. Link the new rows to their base exercises
UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Back Squat' AND v.variation_of IS NULL AND v.name IN (
  'Smith Machine Squat','Zercher Squat','Landmine Squat','Barbell Split Squat','Dumbbell Split Squat','Single-Leg Leg Press');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Deadlift' AND v.variation_of IS NULL AND v.name IN (
  'Stiff-Leg Deadlift','Good Morning','Single-Leg Romanian Deadlift','Cable Pull-Through','Dumbbell Swing');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Barbell Bench Press' AND v.variation_of IS NULL AND v.name IN (
  'Machine Incline Chest Press','Smith Machine Bench Press','Cable Chest Press');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Overhead Press' AND v.variation_of IS NULL AND v.name IN (
  'Seated Barbell Overhead Press','Landmine Press','Pike Push-Up');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Barbell Row' AND v.variation_of IS NULL AND v.name IN (
  'Pendlay Row','Single-Arm Cable Row','Meadows Row');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Lat Pulldown' AND v.variation_of IS NULL AND v.name IN (
  'Wide-Grip Lat Pulldown','Close-Grip Lat Pulldown');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Pull-Up' AND v.variation_of IS NULL AND v.name = 'Assisted Pull-Up Machine';

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Dumbbell Lunge' AND v.variation_of IS NULL AND v.name IN (
  'Barbell Walking Lunge','Dumbbell Lateral Lunge','Bodyweight Forward Lunge','Dumbbell Curtsy Lunge');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Dumbbell Bicep Curl' AND v.variation_of IS NULL AND v.name IN (
  'Dumbbell Concentration Curl','Zottman Curl','Cable Rope Hammer Curl');

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Cable Triceps Pushdown' AND v.variation_of IS NULL AND v.name = 'Dumbbell Triceps Kickback';

UPDATE public.exercises v SET variation_of = b.id FROM public.exercises b
WHERE b.name = 'Plank' AND v.variation_of IS NULL AND v.name IN ('Ab Wheel Rollout','Bicycle Crunch','Reverse Crunch','Cable Woodchop');

-- 7. Pattern is now required
UPDATE public.exercises SET movement_pattern = 'core' WHERE movement_pattern IS NULL;
ALTER TABLE public.exercises ALTER COLUMN movement_pattern SET NOT NULL;