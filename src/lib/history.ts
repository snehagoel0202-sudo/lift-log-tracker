import { supabase } from "@/integrations/supabase/client";
import { localDateString } from "@/lib/checkins";

export type LoggedSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  unit: "kg" | "lb";
  reps: number | null;
  rpe: number | null;
  date: string;
};

export type LoggedSession = {
  id: string;
  date: string;
  notes: string | null;
  source: "plan" | "checklist" | "chat";
  sets: LoggedSet[];
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** All of the user's sessions (newest first) with their sets, excluding hidden rows. */
export async function fetchHistory(): Promise<LoggedSession[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("id, date, notes, source")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (sessionsError) throw sessionsError;

  const ids = (sessions ?? []).map((session) => session.id);
  if (ids.length === 0) return [];

  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("id, session_id, exercise_id, set_number, weight, unit, reps, rpe")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("session_id", ids)
    .order("set_number", { ascending: true });
  if (setsError) throw setsError;

  const byDate = new Map(((sessions ?? []) as { id: string; date: string }[]).map((s) => [s.id, s.date]));

  return ((sessions ?? []) as Omit<LoggedSession, "sets">[]).map((session) => ({
    ...session,
    sets: ((sets ?? []) as Omit<LoggedSet, "date">[])
      .filter((set) => set.session_id === session.id)
      .map((set) => ({
        ...set,
        weight: set.weight == null ? null : Number(set.weight),
        date: byDate.get(set.session_id) ?? session.date,
      })),
  }));
}

export const historyQueryOptions = {
  queryKey: ["history"] as const,
  queryFn: fetchHistory,
};

export type SetEdit = {
  weight: number | null;
  unit: "kg" | "lb";
  reps: number | null;
  rpe: number | null;
};

export async function updateSet(id: string, edit: SetEdit) {
  const { error } = await supabase.from("workout_sets").update(edit).eq("id", id);
  if (error) throw error;
}

/** Soft delete only — the row stays in the database. */
export async function hideSet(id: string) {
  const { error } = await supabase
    .from("workout_sets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Monday of the local week containing `date`. */
export function weekStart(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return localDateString(d);
}

export type WeekSummary = {
  workouts: number;
  sets: number;
  volume: { unit: "kg" | "lb"; total: number }[];
};

export function summariseWeek(sessions: LoggedSession[], start = weekStart()): WeekSummary {
  const thisWeek = sessions.filter((session) => session.date >= start);
  const totals = new Map<"kg" | "lb", number>();
  let sets = 0;
  for (const session of thisWeek) {
    for (const set of session.sets) {
      sets += 1;
      if (set.weight != null && set.reps != null) {
        totals.set(set.unit, (totals.get(set.unit) ?? 0) + set.weight * set.reps);
      }
    }
  }
  return {
    workouts: thisWeek.length,
    sets,
    volume: [...totals.entries()].map(([unit, total]) => ({ unit, total })),
  };
}

/** Epley estimate: weight × (1 + reps / 30). */
export function estimatedOneRepMax(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

export type BestSetPoint = {
  date: string;
  weight: number;
  reps: number | null;
  e1rm: number | null;
};

/**
 * Best set per date for one exercise, split by unit — units are never mixed
 * or converted, so each unit becomes its own series.
 */
export function bestSetsByUnit(sessions: LoggedSession[], exerciseId: string) {
  const byUnit = new Map<"kg" | "lb", Map<string, BestSetPoint>>();
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.exercise_id !== exerciseId || set.weight == null) continue;
      const series = byUnit.get(set.unit) ?? new Map<string, BestSetPoint>();
      const existing = series.get(session.date);
      if (!existing || set.weight > existing.weight) {
        series.set(session.date, {
          date: session.date,
          weight: set.weight,
          reps: set.reps,
          e1rm: set.reps == null ? null : Math.round(estimatedOneRepMax(set.weight, set.reps) * 10) / 10,
        });
      }
      byUnit.set(set.unit, series);
    }
  }
  return [...byUnit.entries()].map(([unit, series]) => ({
    unit,
    points: [...series.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }));
}

export function formatDayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${MONTHS[(month ?? 1) - 1]}${year === new Date().getFullYear() ? "" : ` ${year}`}`;
}
