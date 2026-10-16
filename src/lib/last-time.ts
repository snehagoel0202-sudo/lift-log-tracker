import { convertWeight } from "@/lib/plan-rules";

type Unit = "kg" | "lb";

export type PastSet = {
  exercise_id: string;
  set_number: number;
  weight: number | null;
  unit: Unit;
  reps: number | null;
  deleted_at?: string | null;
};

export type PastSession = {
  id: string;
  date: string;
  deleted_at?: string | null;
  sets: PastSet[];
};

export type ExerciseSession = { id: string; date: string; sets: PastSet[] };

/**
 * Sessions that include this exercise, newest first, ignoring hidden sessions/sets.
 * Expects `sessions` in any order; sorts by date descending (stable for ties).
 */
export function exerciseSessions(
  sessions: PastSession[],
  exerciseId: string,
  limit = Infinity,
): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  const sorted = sessions
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.date < b.s.date ? 1 : a.s.date > b.s.date ? -1 : a.i - b.i))
    .map(({ s }) => s);
  for (const session of sorted) {
    if (session.deleted_at) continue;
    const sets = session.sets
      .filter((set) => set.exercise_id === exerciseId && !set.deleted_at)
      .sort((a, b) => a.set_number - b.set_number);
    if (sets.length) out.push({ id: session.id, date: session.date, sets });
    if (out.length >= limit) break;
  }
  return out;
}

export function lastTime(sessions: PastSession[], exerciseId: string) {
  return exerciseSessions(sessions, exerciseId, 1)[0] ?? null;
}

/** Convert to the profile unit. Same unit is kept exact; conversions round to 0.5 kg / 1 lb. */
export function toUnit(weight: number | null, from: Unit, to: Unit): number | null {
  if (weight == null) return null;
  if (from === to) return weight;
  const value = convertWeight(weight, from, to);
  const step = to === "kg" ? 0.5 : 1;
  return Math.round(value / step) * step;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}

export function formatSets(sets: PastSet[], unit: Unit) {
  return sets
    .map((set, i) => {
      const w = toUnit(set.weight, set.unit, unit);
      const weight = w == null ? "—" : i === 0 ? `${w} ${unit}` : `${w}`;
      return `${weight} × ${set.reps ?? "—"}`;
    })
    .join(", ");
}

export function formatLastTime(session: ExerciseSession, unit: Unit) {
  return `${shortDate(session.date)} · ${formatSets(session.sets, unit)}`;
}

/** Heaviest set (in profile unit), reps breaking ties. */
export function bestSet(sets: PastSet[], unit: Unit) {
  let best: { weight: number; reps: number | null } | null = null;
  for (const set of sets) {
    const w = toUnit(set.weight, set.unit, unit);
    if (w == null) continue;
    if (!best || w > best.weight || (w === best.weight && (set.reps ?? 0) > (best.reps ?? 0))) {
      best = { weight: w, reps: set.reps };
    }
  }
  return best;
}

/* ---------- checklist row helpers ---------- */

export type SetRow = {
  done: boolean;
  weight: string;
  reps: string;
  rpe: string;
  weightEdited: boolean;
  repsEdited: boolean;
  weightAuto: boolean;
  repsAuto: boolean;
};

export const emptyRow = (): SetRow => ({
  done: false,
  weight: "",
  reps: "",
  rpe: "",
  weightEdited: false,
  repsEdited: false,
  weightAuto: false,
  repsAuto: false,
});

/** Copy last time's weight/reps into empty, unticked, untyped fields. Never ticks a set. */
export function applySameAsLastTime(rows: SetRow[], last: PastSet[], unit: Unit): SetRow[] {
  return rows.map((row, i) => {
    const src = last[i];
    if (!src || row.done) return row;
    const next = { ...row };
    const w = toUnit(src.weight, src.unit, unit);
    if (next.weight === "" && !next.weightEdited && w != null) next.weight = String(w);
    if (next.reps === "" && !next.repsEdited && src.reps != null) next.reps = String(src.reps);
    return next;
  });
}

/**
 * The person typed `field` in set `index`. Copy that one field into LATER sets
 * that are empty or still auto-filled, untyped and unticked. Clearing the source
 * clears its auto-filled values too. Earlier sets are never touched.
 */
export function typeField(
  rows: SetRow[],
  index: number,
  field: "weight" | "reps",
  value: string,
): SetRow[] {
  const flag = field === "weight" ? "weightEdited" : "repsEdited";
  const autoFlag = field === "weight" ? "weightAuto" : "repsAuto";
  const list = rows.map((r) => ({ ...r }));
  const source = list[index];
  if (!source) return list;
  list[index] = { ...source, [field]: value, [flag]: true, [autoFlag]: false };
  const cleared = value.trim() === "";
  for (let j = index + 1; j < list.length; j++) {
    const r = list[j];
    if (!r || r.done || r[flag] || (r[field] !== "" && !r[autoFlag])) continue;
    if (cleared && !r[autoFlag]) continue;
    list[j] = { ...r, [field]: cleared ? "" : value, [autoFlag]: !cleared };
  }
  return list;
}

/** Only ticked sets are ever saved. */
export function setsToSave(rows: SetRow[]) {
  return rows
    .map((row, i) => ({ row, setNumber: i + 1 }))
    .filter(({ row }) => row.done)
    .map(({ row, setNumber }) => ({
      set_number: setNumber,
      weight: row.weight.trim() === "" ? null : Number(row.weight),
      reps: row.reps.trim() === "" ? null : Number(row.reps),
      rpe: row.rpe.trim() === "" ? null : Number(row.rpe),
    }));
}
