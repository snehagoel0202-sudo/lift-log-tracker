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
  postpartum_safe?: boolean;
};

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

const REP_MIN = 8;
const REP_MAX = 12;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function progression(
  exercise: PlanExercise,
  history: HistorySet[],
  allowIncrease: boolean,
): Pick<PlanItemDraft, "target_weight" | "unit" | "reason" | "rationale"> {
  if (history.length === 0) {
    return {
      target_weight: null,
      unit: "kg",
      reason: "no_history",
      rationale: "Pick a weight you could lift 2-3 more times.",
    };
  }

  const unit = history[0]!.unit;
  const weights = history.map((set) => set.weight).filter((w): w is number => w != null);
  const baseWeight = weights.length > 0 ? Math.max(...weights) : null;
  const weightLabel = baseWeight != null ? `${round(baseWeight)} ${unit}` : "the same weight";

  const rpes = history.map((set) => set.rpe).filter((r): r is number => r != null);
  const avgRpe = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const hardRpe = rpes.some((rpe) => rpe >= 9.5);
  const belowMin = history.filter((set) => (set.reps ?? 0) < REP_MIN).length;
  const allHitTop = history.every((set) => (set.reps ?? 0) >= REP_MAX);

  if (allHitTop && (avgRpe == null || avgRpe <= 8) && !hardRpe) {
    if (allowIncrease && baseWeight != null && exercise.weight_step > 0) {
      const next = round(baseWeight + exercise.weight_step);
      return {
        target_weight: next,
        unit,
        reason: "increase",
        rationale: `You hit the top of the range last time — go up to ${next} ${unit}.`,
      };
    }
    return {
      target_weight: baseWeight,
      unit,
      reason: "hold_capped",
      rationale: `Ready to go heavier, but hold ${weightLabel} today.`,
    };
  }

  if (belowMin >= 2 || hardRpe) {
    return {
      target_weight: baseWeight,
      unit,
      reason: "hold",
      rationale: `Stay at ${weightLabel} until the reps come easier.`,
    };
  }

  return {
    target_weight: baseWeight,
    unit,
    reason: "one_more_rep",
    rationale: `Same ${weightLabel} — aim for one more rep than last time.`,
  };
}

export function buildPlan(input: {
  today: string;
  daysPerWeek: number | null;
  equipment: "full_gym" | "dumbbells_only" | "bodyweight_only" | null;
  exercises: PlanExercise[];
  historyByExercise: Record<string, HistorySet[]>;
  checkin: CheckinSnapshot | null;
  postpartum?: PostpartumInfo | null;
}): PlanDraft {
  const pp = postpartumStatus(input.postpartum ?? null, input.today);
  if (pp.mode === "blocked") {
    throw new Error("Postpartum: no strength plan until cleared");
  }
  const postpartumOn = pp.mode === "active";
  const earlyPostpartum = pp.mode === "active" && pp.earlyPhase;
  const allowed = allowedEquipment(input.equipment);
  const pool = input.exercises
    .filter((exercise) => allowed.includes(exercise.equipment))
    .filter(
      (exercise) =>
        !postpartumOn || (exercise.postpartum_safe === true && exercise.impact_level === "low"),
    )
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
  if (pain) {
    notes.push(
      `Rest the ${checkin?.pain_area?.trim() || "painful area"} and keep weights where they are. Take it easy today. If the pain is sharp or doesn't go away, check with a professional.`,
    );
  }

  if (earlyPostpartum) {
    notes.push("You're in your first 4 weeks back, so sets are capped at 2 and weights stay the same.");
  }
  if (postpartumOn) notes.push(POSTPARTUM_WARNING_NOTE);

  const perDay = 5;
  const days: PlanDayDraft[] = split.map((day, index) => {
    let picks = pickForDay(day.groups, pool, perDay, index);
    if (sore && picks.length > 4) picks = picks.slice(0, picks.length - 1);

    const items: PlanItemDraft[] = picks.map((exercise) => {
      const history = input.historyByExercise[exercise.id] ?? [];
      const progress = progression(exercise, history, allowIncrease);
      let sets = Math.max(1, lowReadiness ? 2 : 3);
      if (earlyPostpartum) sets = Math.min(sets, 2);
      return {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets,
        rep_min: REP_MIN,
        rep_max: REP_MAX,
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
