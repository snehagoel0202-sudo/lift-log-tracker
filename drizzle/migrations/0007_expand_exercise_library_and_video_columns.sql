ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS video_title TEXT,
  ADD COLUMN IF NOT EXISTS video_channel TEXT,
  ADD COLUMN IF NOT EXISTS video_channel_url TEXT;

UPDATE public.exercises SET muscle_group = 'Arms' WHERE muscle_group = 'arms';

INSERT INTO public.exercises (name, aliases, muscle_group, equipment, is_compound, weight_step, impact_level, postpartum_safe) VALUES
-- Legs / squat variations
('Barbell Sumo Squat', ARRAY['sumo squat','wide stance squat','barbell sumo squats'], 'Legs', 'barbell', true, 2.5, 'moderate', false),
('Box Squat', ARRAY['box squats','barbell box squat'], 'Legs', 'barbell', true, 2.5, 'moderate', true),
('Dumbbell Squat', ARRAY['dumbbell squats','db squat'], 'Legs', 'dumbbell', true, 2, 'moderate', true),
('Dumbbell Sumo Squat', ARRAY['sumo dumbbell squat','sumo goblet squat','dumbbell sumo squats'], 'Legs', 'dumbbell', true, 2, 'moderate', true),
('Bodyweight Squat', ARRAY['air squat','bodyweight squats','squat no weight'], 'Legs', 'bodyweight', true, 0, 'low', true),
('Hack Squat Machine', ARRAY['hack squat','hack squats','machine hack squat'], 'Legs', 'machine', true, 5, 'moderate', false),
('Dumbbell Bulgarian Split Squat', ARRAY['bulgarian split squat','split squat','rear foot elevated split squat'], 'Legs', 'dumbbell', true, 2, 'moderate', true),
('Dumbbell Walking Lunge', ARRAY['walking lunge','walking lunges'], 'Legs', 'dumbbell', true, 2, 'moderate', true),
('Bodyweight Reverse Lunge', ARRAY['reverse lunge','reverse lunges','backward lunge'], 'Legs', 'bodyweight', true, 0, 'low', true),
('Sumo Deadlift', ARRAY['sumo deadlifts','sumo dead lift'], 'Legs', 'barbell', true, 2.5, 'moderate', false),
('Trap Bar Deadlift', ARRAY['hex bar deadlift','trap bar deadlifts'], 'Legs', 'barbell', true, 2.5, 'moderate', true),
('Dumbbell Romanian Deadlift', ARRAY['dumbbell rdl','db romanian deadlift','dumbbell stiff leg deadlift'], 'Legs', 'dumbbell', true, 2, 'low', true),
('Lying Leg Curl', ARRAY['leg curl','lying hamstring curl'], 'Legs', 'machine', false, 5, 'low', true),
('Seated Calf Raise', ARRAY['seated calf raises'], 'Legs', 'machine', false, 5, 'low', true),
-- Chest
('Incline Dumbbell Bench Press', ARRAY['incline dumbbell press','incline db bench','incline dumbbell bench'], 'Chest', 'dumbbell', true, 2, 'low', true),
('Decline Barbell Bench Press', ARRAY['decline bench press','decline bench'], 'Chest', 'barbell', true, 2.5, 'low', true),
('Close-Grip Bench Press', ARRAY['close grip bench','narrow grip bench press'], 'Chest', 'barbell', true, 2.5, 'low', true),
('Pec Deck Machine', ARRAY['pec deck','machine chest fly','pec fly machine'], 'Chest', 'machine', false, 5, 'low', true),
-- Back
('Chin-Up', ARRAY['chin up','chin ups','chinups'], 'Back', 'bodyweight', true, 0, 'moderate', false),
('T-Bar Row', ARRAY['t bar row','tbar row','t-bar rows'], 'Back', 'machine', true, 5, 'low', true),
('Inverted Row', ARRAY['inverted rows','body row','bodyweight row'], 'Back', 'bodyweight', true, 0, 'low', true),
('Barbell Shrug', ARRAY['barbell shrugs','shrugs'], 'Back', 'barbell', false, 2.5, 'low', true),
('Dumbbell Shrug', ARRAY['dumbbell shrugs'], 'Back', 'dumbbell', false, 2, 'low', true),
('Straight-Arm Cable Pulldown', ARRAY['straight arm pulldown','lat pushdown'], 'Back', 'cable', false, 2.5, 'low', true),
-- Shoulders
('Seated Dumbbell Shoulder Press', ARRAY['seated dumbbell press','seated shoulder press'], 'Shoulders', 'dumbbell', true, 2, 'low', true),
('Arnold Press', ARRAY['arnold presses','dumbbell arnold press'], 'Shoulders', 'dumbbell', true, 2, 'low', true),
('Cable Lateral Raise', ARRAY['cable lateral raises','cable side raise'], 'Shoulders', 'cable', false, 2.5, 'low', true),
('Dumbbell Rear Delt Fly', ARRAY['rear delt fly','reverse fly','bent over fly'], 'Shoulders', 'dumbbell', false, 2, 'low', true),
('Barbell Upright Row', ARRAY['upright row','upright rows'], 'Shoulders', 'barbell', false, 2.5, 'low', true),
-- Arms
('Incline Dumbbell Curl', ARRAY['incline curl','incline dumbbell curls'], 'Arms', 'dumbbell', false, 2, 'low', true),
('Machine Preacher Curl', ARRAY['preacher curl','preacher curls'], 'Arms', 'machine', false, 5, 'low', true),
('Barbell Skull Crusher', ARRAY['skull crusher','skull crushers','lying triceps extension'], 'Arms', 'barbell', false, 2.5, 'low', true),
('Parallel Bar Dip', ARRAY['dips','triceps dip','parallel bar dips'], 'Arms', 'bodyweight', true, 0, 'moderate', false),
('Cable Rope Overhead Triceps Extension', ARRAY['rope overhead extension','cable overhead triceps'], 'Arms', 'cable', false, 2.5, 'low', true),
('Barbell Reverse Curl', ARRAY['reverse curl','reverse curls'], 'Arms', 'barbell', false, 2.5, 'low', true),
-- Core
('Cable Crunch', ARRAY['cable crunches','kneeling cable crunch'], 'Core', 'cable', false, 2.5, 'low', false),
('Russian Twist', ARRAY['russian twists'], 'Core', 'bodyweight', false, 0, 'low', false),
('Hollow Hold', ARRAY['hollow body hold'], 'Core', 'bodyweight', false, 0, 'low', false)
ON CONFLICT (name) DO NOTHING;