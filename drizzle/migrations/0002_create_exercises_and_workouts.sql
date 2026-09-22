-- Enums
CREATE TYPE public.exercise_equipment AS ENUM ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight');
CREATE TYPE public.impact_level AS ENUM ('low', 'moderate', 'high');
CREATE TYPE public.workout_source AS ENUM ('plan', 'checklist', 'chat');

-- Shared exercise library (read-only for users)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  muscle_group TEXT NOT NULL,
  equipment public.exercise_equipment NOT NULL,
  is_compound BOOLEAN NOT NULL DEFAULT false,
  weight_step NUMERIC(5,2) NOT NULL DEFAULT 0,
  impact_level public.impact_level NOT NULL DEFAULT 'moderate',
  postpartum_safe BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exercises TO anon;
GRANT SELECT ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercise library is readable by anyone"
ON public.exercises FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX exercises_muscle_group_idx ON public.exercises (muscle_group);

-- Workout sessions
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  source public.workout_source NOT NULL DEFAULT 'checklist',
  plan_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
ON public.workout_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions"
ON public.workout_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions"
ON public.workout_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions"
ON public.workout_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX workout_sessions_user_date_idx ON public.workout_sessions (user_id, date DESC);

-- Workout sets (one row per completed set)
CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  set_number SMALLINT NOT NULL,
  weight NUMERIC(6,2),
  unit public.weight_unit NOT NULL DEFAULT 'kg',
  reps SMALLINT,
  rpe NUMERIC(3,1),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_sets_rpe_range CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  CONSTRAINT workout_sets_set_number_positive CHECK (set_number > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sets"
ON public.workout_sets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sets"
ON public.workout_sets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sets"
ON public.workout_sets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sets"
ON public.workout_sets FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX workout_sets_session_idx ON public.workout_sets (session_id, set_number);
CREATE INDEX workout_sets_user_exercise_idx ON public.workout_sets (user_id, exercise_id);

-- Seed exercise library
INSERT INTO public.exercises (name, aliases, muscle_group, equipment, is_compound, weight_step, impact_level, postpartum_safe) VALUES
('Back Squat', ARRAY['squat','squats','back squat'], 'Legs', 'barbell', true, 2.5, 'high', false),
('Front Squat', ARRAY['front squat'], 'Legs', 'barbell', true, 2.5, 'high', false),
('Deadlift', ARRAY['deadlift','deadlifts','conventional deadlift'], 'Legs', 'barbell', true, 2.5, 'high', false),
('Romanian Deadlift', ARRAY['rdl','romanian deadlift'], 'Legs', 'barbell', true, 2.5, 'high', false),
('Barbell Hip Thrust', ARRAY['hip thrust','hip thrusts'], 'Legs', 'barbell', true, 2.5, 'moderate', false),
('Leg Press', ARRAY['leg press'], 'Legs', 'machine', true, 5, 'moderate', false),
('Leg Extension', ARRAY['leg extension','quad extension'], 'Legs', 'machine', false, 5, 'low', true),
('Seated Leg Curl', ARRAY['leg curl','hamstring curl'], 'Legs', 'machine', false, 5, 'low', true),
('Standing Calf Raise', ARRAY['calf raise','calf raises'], 'Legs', 'machine', false, 5, 'low', true),
('Goblet Squat', ARRAY['goblet squat'], 'Legs', 'dumbbell', true, 2, 'moderate', false),
('Dumbbell Lunge', ARRAY['lunge','lunges','dumbbell lunge'], 'Legs', 'dumbbell', true, 2, 'moderate', false),
('Dumbbell Step-Up', ARRAY['step up','step-ups'], 'Legs', 'dumbbell', true, 2, 'moderate', false),
('Glute Bridge', ARRAY['glute bridge','glute bridges','bridge'], 'Legs', 'bodyweight', false, 0, 'low', true),
('Wall Sit', ARRAY['wall sit','wall sits'], 'Legs', 'bodyweight', false, 0, 'low', true),
('Bodyweight Box Step-Up', ARRAY['box step up','bodyweight step up'], 'Legs', 'bodyweight', true, 0, 'low', true),
('Cable Glute Kickback', ARRAY['kickback','glute kickback'], 'Legs', 'cable', false, 5, 'low', true),
('Barbell Bench Press', ARRAY['bench','bench press','flat bench'], 'Chest', 'barbell', true, 2.5, 'moderate', false),
('Incline Barbell Bench Press', ARRAY['incline bench','incline bench press'], 'Chest', 'barbell', true, 2.5, 'moderate', false),
('Dumbbell Bench Press', ARRAY['dumbbell bench','db bench press'], 'Chest', 'dumbbell', true, 2, 'moderate', false),
('Dumbbell Chest Fly', ARRAY['chest fly','dumbbell fly'], 'Chest', 'dumbbell', false, 2, 'low', true),
('Chest Press Machine', ARRAY['machine chest press','chest press'], 'Chest', 'machine', true, 5, 'low', true),
('Cable Chest Fly', ARRAY['cable fly','cable crossover'], 'Chest', 'cable', false, 5, 'low', true),
('Push-Up', ARRAY['push up','push-ups','pushups'], 'Chest', 'bodyweight', true, 0, 'moderate', false),
('Incline Push-Up', ARRAY['incline push up','incline pushups'], 'Chest', 'bodyweight', true, 0, 'low', true),
('Barbell Row', ARRAY['barbell row','bent over row'], 'Back', 'barbell', true, 2.5, 'high', false),
('Pull-Up', ARRAY['pull up','pull-ups','pullups'], 'Back', 'bodyweight', true, 0, 'moderate', false),
('Lat Pulldown', ARRAY['lat pulldown','pulldown'], 'Back', 'cable', true, 5, 'low', true),
('Seated Cable Row', ARRAY['cable row','seated row'], 'Back', 'cable', true, 5, 'low', true),
('Single-Arm Dumbbell Row', ARRAY['dumbbell row','db row','one arm row'], 'Back', 'dumbbell', true, 2, 'low', true),
('Band Row', ARRAY['band row','resistance band row'], 'Back', 'bodyweight', false, 0, 'low', true),
('Chest-Supported Machine Row', ARRAY['machine row','chest supported row'], 'Back', 'machine', true, 5, 'low', true),
('Face Pull', ARRAY['face pull','face pulls'], 'Back', 'cable', false, 5, 'low', true),
('Overhead Press', ARRAY['ohp','overhead press','military press'], 'Shoulders', 'barbell', true, 2.5, 'high', false),
('Dumbbell Shoulder Press', ARRAY['shoulder press','db press'], 'Shoulders', 'dumbbell', true, 2, 'moderate', false),
('Dumbbell Lateral Raise', ARRAY['lateral raise','side raise'], 'Shoulders', 'dumbbell', false, 2, 'low', true),
('Machine Shoulder Press', ARRAY['machine shoulder press'], 'Shoulders', 'machine', true, 5, 'moderate', false),
('Barbell Curl', ARRAY['barbell curl','bicep curl'], 'Arms', 'barbell', false, 2.5, 'low', true),
('Dumbbell Hammer Curl', ARRAY['hammer curl','hammer curls'], 'Arms', 'dumbbell', false, 2, 'low', true),
('Cable Triceps Pushdown', ARRAY['tricep pushdown','pushdown'], 'Arms', 'cable', false, 5, 'low', true),
('Overhead Dumbbell Triceps Extension', ARRAY['tricep extension','overhead extension'], 'Arms', 'dumbbell', false, 2, 'low', true),
('Bench Dip', ARRAY['bench dip','tricep dip'], 'Arms', 'bodyweight', false, 0, 'moderate', false),
('Plank', ARRAY['plank','planks','front plank'], 'Core', 'bodyweight', false, 0, 'low', true),
('Side Plank', ARRAY['side plank','side planks'], 'Core', 'bodyweight', false, 0, 'low', true),
('Dead Bug', ARRAY['dead bug','dead bugs'], 'Core', 'bodyweight', false, 0, 'low', true),
('Bird Dog', ARRAY['bird dog','bird dogs'], 'Core', 'bodyweight', false, 0, 'low', true),
('Cable Pallof Press', ARRAY['pallof press'], 'Core', 'cable', false, 5, 'low', true),
('Hanging Leg Raise', ARRAY['hanging leg raise','leg raises'], 'Core', 'bodyweight', false, 0, 'high', false);
