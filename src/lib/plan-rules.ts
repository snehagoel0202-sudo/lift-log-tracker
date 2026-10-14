/**
 * Fixed progression rules for the weekly plan. All numbers are decided here, in
 * code — the AI is only ever asked to describe what these rules produced.
 */

export type PlanExercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";
  is_compound: boolean;
  weight_step: number;
  impact_level?: "low" | "moderate" | "high";
  movement_pattern?: "squat" | "hinge" | "push" | "pull" | "lunge" | "carry" | "core";
  postpartum_safe?: boolean;
};

export const PAIN_AREAS = [
  "Knee",
  "Hip",
  "Lower back",
  "Shoulder",
  "Wrist",
  "Neck",
  "Pelvic floor",
  "C-section scar",
  "Other",
] as const;
export type PainArea = (typeof PAIN_AREAS)[number];

/** Pain areas are saved as a comma-separated list of chip labels. Unknown text is ignored. */
export function parsePainAreas(value: string | null | undefined): PainArea[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .map((part) => PAIN_AREAS.find((area) => area.toLowerCase() === part))
    .filter((area): area is PainArea => area != null);
}

type Pattern = NonNullable<PlanExercise["movement_pattern"]>;
type AreaRule = { patterns?: Pattern[]; groups?: string[]; nonLowImpact?: boolean };

/** Which exercises load each painful area. "Other" removes nothing specific. */
export const PAIN_AREA_RULES: Record<PainArea, AreaRule> = {
  Knee: { patterns: ["squat", "lunge"] },
  Hip: { patterns: ["squat", "hinge", "lunge"] },
  "Lower back": { patterns: ["hinge", "carry"] },
  Shoulder: { patterns: ["push", "pull"], groups: ["Shoulders"] },
  Wrist: { patterns: ["push", "carry"] },
  Neck: { patterns: ["carry"], groups: ["Shoulders"] },
  "Pelvic floor": { patterns: ["core"], nonLowImpact: true },
  "C-section scar": { patterns: ["core"], nonLowImpact: true },
  Other: {},
};

export function loadsPainArea(exercise: PlanExercise, areas: PainArea[]) {
  return areas.some((area) => {
    const rule = PAIN_AREA_RULES[area];
    if (exercise.movement_pattern && rule.patterns?.includes(exercise.movement_pattern)) return true;
    if (rule.groups?.includes(exercise.muscle_group)) return true;
    if (rule.nonLowImpact && exercise.impact_level !== "low") return true;
    return false;
  });
}

export type BirthType = "vaginal" | "c_section" | "prefer_not_to_say";

export type PostpartumInfo = {
  postpartum: boolean;
  weeks_since_birth: number | null;
  /** Local date the weeks value was entered, so it keeps counting up. */
  weeks_recorded_on: string | null;
  birth_type: BirthType | null;
  cleared: boolean | null;
  cleared_on: string | null;
};

export type PostpartumStatus =
  | { mode: "off" }
  | { mode: "blocked"; reason: "not_cleared" | "too_early" }
  | { mode: "active"; earlyPhase: boolean };

export const POSTPARTUM_BLOCK_MESSAGE =
  "Check with your doctor or a women's health physio before starting. You can still log anything you do.";
export const POSTPARTUM_WARNING_NOTE =
  "Stop and check with a professional if you notice leaking, heaviness in the pelvis, doming of the belly, pain, or bleeding.";

function toDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function daysBetween(from: string, to: string) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

/** Minimum weeks after birth before a strength plan. C-section (and unknown) waits longer. */
export function minimumWeeks(birthType: BirthType | null) {
  return birthType === "vaginal" ? 6 : 8;
}

export function currentWeeksSinceBirth(info: PostpartumInfo, today: string) {
  if (info.weeks_since_birth == null) return null;
  const extra = info.weeks_recorded_on
    ? Math.max(0, Math.floor(daysBetween(info.weeks_recorded_on, today) / 7))
    : 0;
  return info.weeks_since_birth + extra;
}

export function postpartumStatus(info: PostpartumInfo | null, today: string): PostpartumStatus {
  if (!info?.postpartum) return { mode: "off" };
  if (info.cleared !== true) return { mode: "blocked", reason: "not_cleared" };
  const weeks = currentWeeksSinceBirth(info, today);
  if (weeks == null || weeks < minimumWeeks(info.birth_type)) {
    return { mode: "blocked", reason: "too_early" };
  }
  // First 4 plan weeks after clearance: plan weeks start on Monday.
  const clearedWeek = weekStartFrom(info.cleared_on ?? today);
  const earlyPhase = daysBetween(clearedWeek, weekStartFrom(today)) < 28;
  return { mode: "active", earlyPhase };
}

export type HistorySet = {
  weight: number | null;
  unit: "kg" | "lb";
  reps: number | null;
  rpe: number | null;
};

export type CheckinSnapshot = {
  sleep: number | null;
  energy: number | null;
  soreness: number | null;
  pain: boolean;
  pain_area: string | null;
};

export type PlanItemDraft = {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  target_weight: number | null;
  unit: "kg" | "lb";
  reason: string;
  rationale: string;
};

export type PlanDayDraft = {
  day_number: number;
  label: string;
  items: PlanItemDraft[];
};

export type PlanDraft = {
  week_start: string;
  days: PlanDayDraft[];
  notes: string[];
  summary: string;
};

const FULL_BODY = ["Legs", "Chest", "Back", "Shoulders", "Arms", "Core"];
const UPPER = ["Chest", "Back", "Shoulders", "Arms"];
const LOWER = ["Legs", "Core", "Legs", "Core"];
const PUSH = ["Chest", "Shoulders", "Chest", "Arms"];
const PULL = ["Back", "Back", "Arms", "Core"];
const LEGS = ["Legs", "Legs", "Legs", "Core"];

export function splitForDays(days: number): { label: string; groups: string[] }[] {
  const count = Math.min(6, Math.max(2, days));
  if (count <= 3) {
    return Array.from({ length: count }, () => ({ label: "Full body", groups: FULL_BODY }));
  }
  if (count === 4) {
    return [
      { label: "Upper body", groups: UPPER },
      { label: "Lower body", groups: LOWER },
      { label: "Upper body", groups: UPPER },
      { label: "Lower body", groups: LOWER },
    ];
  }
  const cycle = [
    { label: "Push", groups: PUSH },
    { label: "Pull", groups: PULL },
    { label: "Legs", groups: LEGS },
  ];
  return Array.from({ length: count }, (_, index) => cycle[index % cycle.length]!);
}

export function allowedEquipment(
  equipment: "full_gym" | "dumbbells_only" | "bodyweight_only" | null,
): PlanExercise["equipment"][] {
  if (equipment === "bodyweight_only") return ["bodyweight"];
  if (equipment === "dumbbells_only") return ["dumbbell", "bodyweight"];
  return ["barbell", "dumbbell", "machine", "cable", "bodyweight"];
}

/** Monday of the week containing `date`, as a local YYYY-MM-DD string. */
export function weekStartFrom(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year!, (month ?? 1) - 1, day ?? 1);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function pickForDay(
  groups: string[],
  pool: PlanExercise[],
  perDay: number,
  dayIndex: number,
): PlanExercise[] {
  const chosen: PlanExercise[] = [];
  const used = new Set<string>();

  const byGroup = (group: string, compound: boolean) =>
    pool.filter((e) => e.muscle_group === group && e.is_compound === compound && !used.has(e.id));

  // Compound lifts first, then accessories, walking the day's muscle groups.
  for (const compound of [true, false]) {
    for (let i = 0; i < groups.length && chosen.length < perDay; i += 1) {
      const group = groups[i]!;
      const candidates = byGroup(group, compound);
      if (candidates.length === 0) continue;
      // Rotate choices per day so repeated day labels don't look identical.
      const pick = candidates[(dayIndex + i) % candidates.length]!;
      used.add(pick.id);
      chosen.push(pick);
    }
  }

  // Top up from anything left that matches the day's groups.
  for (const exercise of pool) {
    if (chosen.length >= perDay) break;
    if (used.has(exercise.id)) continue;
    if (!groups.includes(exercise.muscle_group)) continue;
    used.add(exercise.id);
    chosen.push(exercise);
  }

  return chosen;
}

export type TrainingGoal = "strength" | "build_muscle" | "lose_fat" | "general_fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

/** Rep range by goal. Strength uses 4-6 on compound lifts only; its accessories use 8-12. */
export function repRange(goal: TrainingGoal | null, isCompound: boolean): [number, number] {
  if (goal === "strength") return isCompound ? [4, 6] : [8, 12];
  if (goal === "lose_fat" || goal === "general_fitness") return [10, 15];
  return [8, 12];
}

/** Exercises per day: the smaller of the session-length cap and the experience cap. */
export function exercisesPerDay(sessionMinutes: number | null, experience: ExperienceLevel | null) {
  const minutes = sessionMinutes ?? 60;
  const bySession = minutes >= 75 ? 6 : minutes >= 60 ? 5 : minutes >= 45 ? 4 : 3;
  const byExperience = experience === "beginner" ? 4 : experience === "advanced" ? 6 : 5;
  return Math.min(bySession, byExperience);
}

/** Base sets before readiness/postpartum adjustments. Beginners stay within 2-3. */
export function baseSets(goal: TrainingGoal | null, experience: ExperienceLevel | null, isCompound: boolean) {
  if (goal === "strength" && isCompound && experience !== "beginner") return 4;
  return 3;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export const KG_PER_LB = 0.4536;

export function convertWeight(weight: number, from: "kg" | "lb", to: "kg" | "lb") {
  if (from === to) return weight;
  return from === "lb" ? weight * KG_PER_LB : weight / KG_PER_LB;
}

export function roundToStep(value: number, step: number) {
  if (!(step > 0)) return round(value);
  return round(Math.round(value / step) * step);
}

function progression(
  exercise: PlanExercise,
  history: HistorySet[],
  allowIncrease: boolean,
  unit: "kg" | "lb",
  REP_MIN: number,
  REP_MAX: number,
): Pick<PlanItemDraft, "target_weight" | "unit" | "reason" | "rationale"> {
  if (history.length === 0) {
    return {
      target_weight: null,
      unit,
      reason: "no_history",
      rationale: "Pick a weight you could lift 2-3 more times.",
    };
  }

  // Compare everything in the profile unit; say so when a conversion happened.
  const converted = history.some((set) => set.weight != null && set.unit !== unit);
  const weights = history
    .filter((set) => set.weight != null)
    .map((set) => convertWeight(set.weight!, set.unit, unit));
  const baseWeight =
    weights.length > 0 ? roundToStep(Math.max(...weights), exercise.weight_step) : null;
  const weightLabel = baseWeight != null ? `${baseWeight} ${unit}` : "the same weight";
  const note = converted ? ` (converted from your logged ${unit === "kg" ? "lb" : "kg"})` : "";

  const rpes = history.map((set) => set.rpe).filter((r): r is number => r != null);
  const avgRpe = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const hardRpe = rpes.some((rpe) => rpe >= 9.5);
  const belowMin = history.filter((set) => (set.reps ?? 0) < REP_MIN).length;
  const allHitTop = history.every((set) => (set.reps ?? 0) >= REP_MAX);

  if (allHitTop && (avgRpe == null || avgRpe <= 8) && !hardRpe) {
    if (allowIncrease && baseWeight != null && exercise.weight_step > 0) {
      const next = roundToStep(baseWeight + exercise.weight_step, exercise.weight_step);
      return {
        target_weight: next,
        unit,
        reason: "increase",
        rationale: `You hit the top of the range last time — go up to ${next} ${unit}${note}.`,
      };
    }
    return {
      target_weight: baseWeight,
      unit,
      reason: "hold_capped",
      rationale: `Ready to go heavier, but hold ${weightLabel}${note} today.`,
    };
  }

  if (belowMin >= 2 || hardRpe) {
    return {
      target_weight: baseWeight,
      unit,
      reason: "hold",
      rationale: `Stay at ${weightLabel}${note} until the reps come easier.`,
    };
  }

  return {
    target_weight: baseWeight,
    unit,
    reason: "one_more_rep",
    rationale: `Same ${weightLabel}${note} — aim for one more rep than last time.`,
  };
}

export function buildPlan(input: {
  today: string;
  daysPerWeek: number | null;
  goal?: TrainingGoal | null;
  experience?: ExperienceLevel | null;
  sessionMinutes?: number | null;
  equipment: "full_gym" | "dumbbells_only" | "bodyweight_only" | null;
  exercises: PlanExercise[];
  historyByExercise: Record<string, HistorySet[]>;
  checkin: CheckinSnapshot | null;
  postpartum?: PostpartumInfo | null;
  weightUnit?: "kg" | "lb";
}): PlanDraft {
  const weightUnit = input.weightUnit ?? "kg";
  const pp = postpartumStatus(input.postpartum ?? null, input.today);
  if (pp.mode === "blocked") {
    throw new Error("Postpartum: no strength plan until cleared");
  }
  const postpartumOn = pp.mode === "active";
  const earlyPostpartum = pp.mode === "active" && pp.earlyPhase;
  const painAreas = input.checkin?.pain ? parsePainAreas(input.checkin.pain_area) : [];
  const allowed = allowedEquipment(input.equipment);
  const pool = input.exercises
    .filter((exercise) => allowed.includes(exercise.equipment))
    .filter(
      (exercise) =>
        !postpartumOn || (exercise.postpartum_safe === true && exercise.impact_level === "low"),
    )
    .filter((exercise) => !loadsPainArea(exercise, painAreas))
    .sort((a, b) => Number(b.is_compound) - Number(a.is_compound) || a.name.localeCompare(b.name));

  const split = splitForDays(input.daysPerWeek ?? 3);
  const checkin = input.checkin;
  const notes: string[] = [];

  const lowReadiness = Boolean(
    checkin && ((checkin.sleep ?? 5) <= 2 || (checkin.energy ?? 5) <= 2),
  );
  const sore = Boolean(checkin && (checkin.soreness ?? 0) >= 4);
  const pain = Boolean(checkin?.pain);
  const allowIncrease = !lowReadiness && !pain && !earlyPostpartum;

  if (lowReadiness) notes.push("Sleep or energy is low, so this week starts with one set less per exercise and no weight increases.");
  if (sore) notes.push("You're sore, so each day is one exercise shorter.");
  const removing = painAreas.filter((a) => a !== "Other");
  if (pain && removing.length > 0) {
    notes.push(`Exercises that load your ${removing.join(", ").toLowerCase()} are left out this week.`);
  }
  if (pain) {
    notes.push(
      `Rest the ${checkin?.pain_area?.trim().toLowerCase() || "painful area"} and keep weights where they are. Take it easy today. If the pain is sharp or doesn't go away, check with a professional.`,
    );
  }

  if (earlyPostpartum) {
    notes.push("You're in your first 4 weeks back, so sets are capped at 2 and weights stay the same.");
  }
  if (postpartumOn) notes.push(POSTPARTUM_WARNING_NOTE);

  const goal = input.goal ?? null;
  const experience = input.experience ?? null;
  const perDay = exercisesPerDay(input.sessionMinutes ?? null, experience);
  const days: PlanDayDraft[] = split.map((day, index) => {
    let picks = pickForDay(day.groups, pool, perDay, index);
    if (sore && picks.length > 1) picks = picks.slice(0, picks.length - 1);

    const items: PlanItemDraft[] = picks.map((exercise) => {
      const history = input.historyByExercise[exercise.id] ?? [];
      const [repMin, repMax] = repRange(goal, exercise.is_compound);
      const progress = progression(exercise, history, allowIncrease, weightUnit, repMin, repMax);
      let sets = baseSets(goal, experience, exercise.is_compound);
      if (lowReadiness) sets -= 1;
      if (experience === "beginner") sets = Math.min(3, Math.max(2, sets));
      sets = Math.max(1, sets);
      if (earlyPostpartum) sets = Math.min(sets, 2);
      return {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets,
        rep_min: repMin,
        rep_max: repMax,
        ...progress,
      };
    });

    return { day_number: index + 1, label: day.label, items };
  });

  const exerciseCount = days.reduce((total, day) => total + day.items.length, 0);
  const summary = [
    `A ${days.length}-day week (${[...new Set(days.map((d) => d.label))].join(" / ")}) with ${exerciseCount} exercises in total.`,
    ...notes,
  ].join(" ");

  return { week_start: weekStartFrom(input.today), days, notes, summary };
}
