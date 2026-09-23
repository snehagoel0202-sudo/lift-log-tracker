import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReviewInput = z.object({ text: z.string().min(1).max(4000) });

export type ReviewRow = {
  exercise_name: string;
  exercise_id: string | null;
  set_number: number;
  weight: number | null;
  unit: "kg" | "lb" | null;
  reps: number | null;
  rpe: number | null;
};

export type ReviewResult =
  | { ok: true; rows: ReviewRow[]; defaultUnit: "kg" | "lb" }
  | { ok: false; reason: "unreadable" | "unavailable" };

/** Stage 1: AI turns the user's words into rows. Nothing is written to the database here. */
export const reviewWorkoutText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReviewInput.parse(input))
  .handler(async ({ data, context }): Promise<ReviewResult> => {
    const { supabase, userId } = context;

    const { parseWorkoutText, ParseUnreadableError } = await import("./log-parse.server");

    const [{ data: profile }, { data: exercises, error: exercisesError }] = await Promise.all([
      supabase.from("profiles").select("weight_unit").eq("id", userId).maybeSingle(),
      supabase.from("exercises").select("id, name, aliases"),
    ]);
    if (exercisesError) throw exercisesError;
    const defaultUnit = (profile?.weight_unit as "kg" | "lb" | null) ?? "kg";

    const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
    const byName = new Map<string, string>();
    for (const exercise of exercises ?? []) {
      byName.set(normalize(exercise.name), exercise.id);
      for (const alias of (exercise.aliases as string[] | null) ?? []) {
        const keyed = normalize(alias);
        if (keyed && !byName.has(keyed)) byName.set(keyed, exercise.id);
      }
    }

    /** Edit distance, capped: dictation mishears words like "squats" as "spots". */
    const distance = (a: string, b: string) => {
      const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        let last = prev[0]!;
        prev[0] = i;
        for (let j = 1; j <= b.length; j++) {
          const current = prev[j]!;
          prev[j] = Math.min(
            prev[j]! + 1,
            prev[j - 1]! + 1,
            last + (a[i - 1] === b[j - 1] ? 0 : 1),
          );
          last = current;
        }
      }
      return prev[b.length]!;
    };

    /** Loose word-level match: "dumbbell just press" should still find "dumbbell bench press". */
    const tokens = (value: string) => normalize(value).split(" ").filter(Boolean);
    const wordsMatch = (a: string, b: string) => {
      if (a === b) return true;
      if (a.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
      const limit = Math.min(a.length, b.length) <= 5 ? 1 : 2;
      return distance(a, b) <= limit;
    };
    const similarity = (said: string[], candidate: string[]) => {
      const pool = [...candidate];
      let hits = 0;
      for (const word of said) {
        const index = pool.findIndex((other) => wordsMatch(word, other));
        if (index >= 0) {
          hits += 1;
          pool.splice(index, 1);
        }
      }
      return hits / Math.max(said.length, candidate.length);
    };

    /** Exact key first, then the single closest near-miss (never a guess between ties). */
    const matchExercise = (name: string): string | null => {
      const key = normalize(name);
      if (!key) return null;
      const exact = byName.get(key);
      if (exact) return exact;

      const said = tokens(key);
      const limit = key.length <= 5 ? 1 : key.length <= 9 ? 2 : 3;
      let best: { id: string; score: number } | null = null;
      let tied = false;
      for (const [candidate, id] of byName) {
        // Higher score is better: whole-string closeness or word-level overlap.
        const edit = distance(key, candidate);
        const score = Math.max(
          edit <= limit ? 1 - edit / (limit + 1) : 0,
          similarity(said, tokens(candidate)),
        );
        if (score < 0.6) continue;
        if (!best || score > best.score + 0.001) {
          best = { id, score };
          tied = false;
        } else if (Math.abs(score - best.score) <= 0.001 && id !== best.id) {
          tied = true;
        }
      }
      return best && !tied ? best.id : null;
    };


    let parsed;
    try {
      parsed = await parseWorkoutText(data.text);
    } catch (error) {
      const reason = error instanceof ParseUnreadableError ? "unreadable" : "unavailable";
      return { ok: false, reason };
    }

    const counters = new Map<string, number>();
    const rows: ReviewRow[] = parsed.map((set) => {
      const nameKey = normalize(set.exercise_name);
      const seen = (counters.get(nameKey) ?? 0) + 1;
      counters.set(nameKey, seen);
      const unit = set.unit?.toLowerCase().startsWith("lb")
        ? "lb"
        : set.unit?.toLowerCase().startsWith("kg")
          ? "kg"
          : null;
      return {
        exercise_name: set.exercise_name,
        exercise_id: matchExercise(set.exercise_name),
        set_number: set.set_number ?? seen,
        weight: set.weight,
        unit,
        // An impossible rep count is a dictation artefact, never a real value: leave it blank
        // for the user to fill in rather than storing a guess.
        reps: set.reps != null && (set.reps < 1 || set.reps > 50) ? null : set.reps,
        rpe: set.rpe,
      };
    });

    return { ok: true, rows, defaultUnit };
  });

const SaveInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sets: z
    .array(
      z.object({
        exercise_id: z.string().uuid(),
        set_number: z.number().int().positive(),
        weight: z.number().nullable(),
        unit: z.enum(["kg", "lb"]),
        reps: z.number().int().nullable(),
        rpe: z.number().min(1).max(10).nullable(),
      }),
    )
    .min(1),
});

/** Stage 2: only runs after the user reviewed and confirmed the rows. */
export const saveLoggedWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({ user_id: userId, date: data.date, source: "chat", notes: null })
      .select("id")
      .single();
    if (sessionError) throw sessionError;

    const rows = data.sets.map((set) => ({
      session_id: session.id,
      user_id: userId,
      exercise_id: set.exercise_id,
      set_number: set.set_number,
      weight: set.weight,
      unit: set.unit,
      reps: set.reps,
      rpe: set.rpe,
      completed: true,
    }));

    const { error: setsError } = await supabase.from("workout_sets").insert(rows);
    if (setsError) throw setsError;

    return { sessionId: session.id, saved: rows.length };
  });
