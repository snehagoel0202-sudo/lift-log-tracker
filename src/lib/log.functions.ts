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

    const byName = new Map<string, string>();
    for (const exercise of exercises ?? []) {
      byName.set(exercise.name.trim().toLowerCase(), exercise.id);
      for (const alias of (exercise.aliases as string[] | null) ?? []) {
        const keyed = alias.trim().toLowerCase();
        if (keyed && !byName.has(keyed)) byName.set(keyed, exercise.id);
      }
    }

    let parsed;
    try {
      parsed = await parseWorkoutText(data.text);
    } catch (error) {
      const reason = error instanceof ParseUnreadableError ? "unreadable" : "unavailable";
      return { ok: false, reason };
    }

    const counters = new Map<string, number>();
    const rows: ReviewRow[] = parsed.map((set) => {
      const nameKey = set.exercise_name.trim().toLowerCase();
      const seen = (counters.get(nameKey) ?? 0) + 1;
      counters.set(nameKey, seen);
      const unit = set.unit?.toLowerCase().startsWith("lb")
        ? "lb"
        : set.unit?.toLowerCase().startsWith("kg")
          ? "kg"
          : null;
      return {
        exercise_name: set.exercise_name,
        exercise_id: byName.get(nameKey) ?? null,
        set_number: set.set_number ?? seen,
        weight: set.weight,
        unit,
        reps: set.reps,
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
