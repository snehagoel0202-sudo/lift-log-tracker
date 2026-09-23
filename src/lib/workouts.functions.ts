import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveInput = z.object({
  plan_id: z.string().uuid(),
  day_number: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sets: z
    .array(
      z.object({
        exercise_id: z.string().uuid(),
        set_number: z.number().int().positive(),
        weight: z.number().nullable(),
        reps: z.number().int().nullable(),
        rpe: z.number().nullable(),
      }),
    )
    .min(1),
});

export const saveWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("weight_unit")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    const unit = (profile?.weight_unit as "kg" | "lb" | null) ?? "kg";

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        date: data.date,
        source: "plan",
        plan_id: data.plan_id,
        notes: `Day ${data.day_number}`,
      })
      .select("id")
      .single();
    if (sessionError) throw sessionError;

    const rows = data.sets.map((set) => ({
      session_id: session.id,
      user_id: userId,
      exercise_id: set.exercise_id,
      set_number: set.set_number,
      weight: set.weight,
      unit,
      reps: set.reps,
      rpe: set.rpe,
      completed: true,
    }));

    const { error: setsError } = await supabase.from("workout_sets").insert(rows);
    if (setsError) throw setsError;

    return { sessionId: session.id, saved: rows.length, unit };
  });
