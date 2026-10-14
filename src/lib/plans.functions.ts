import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildPlan,
  postpartumStatus,
  type PostpartumInfo,
  type HistorySet,
  type PlanExercise,
} from "./plan-rules";

const DateInput = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: z.enum(["day", "week"]).default("week"),
});

function shiftDays(dateString: string, days: number) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export const recommendPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [profileRes, exercisesRes, checkinRes, setsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "days_per_week, goal, experience, session_minutes, equipment, weight_unit, postpartum, postpartum_weeks_since_birth, postpartum_weeks_recorded_on, postpartum_birth_type, postpartum_cleared, postpartum_cleared_on",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("exercises")
        .select(
          "id, name, muscle_group, equipment, is_compound, weight_step, impact_level, postpartum_safe, movement_pattern",
        ),
      supabase
        .from("checkins")
        .select("date, sleep, energy, soreness, pain, pain_area")
        .eq("user_id", userId)
        .gte("date", shiftDays(data.today, -2))
        .lte("date", data.today)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_sets")
        .select("exercise_id, session_id, weight, unit, reps, rpe, created_at")
        .eq("user_id", userId)
        .eq("completed", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(400),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (exercisesRes.error) throw exercisesRes.error;
    if (setsRes.error) throw setsRes.error;

    const p = profileRes.data;
    const postpartum: PostpartumInfo | null = p
      ? {
          postpartum: p.postpartum,
          weeks_since_birth: p.postpartum_weeks_since_birth,
          weeks_recorded_on: p.postpartum_weeks_recorded_on,
          birth_type: p.postpartum_birth_type,
          cleared: p.postpartum_cleared,
          cleared_on: p.postpartum_cleared_on,
        }
      : null;
    if (postpartumStatus(postpartum, data.today).mode === "blocked") {
      return { planId: null as string | null, blocked: true };
    }

    const exercises: PlanExercise[] = (exercisesRes.data ?? []).map((row) => ({
      ...row,
      weight_step: Number(row.weight_step),
    })) as PlanExercise[];

    // Most recent completed session per exercise only.
    const historyByExercise: Record<string, HistorySet[]> = {};
    const sessionForExercise: Record<string, string> = {};
    for (const row of setsRes.data ?? []) {
      const current = sessionForExercise[row.exercise_id];
      if (current == null) sessionForExercise[row.exercise_id] = row.session_id;
      if (sessionForExercise[row.exercise_id] !== row.session_id) continue;
      (historyByExercise[row.exercise_id] ??= []).push({
        weight: row.weight == null ? null : Number(row.weight),
        unit: row.unit,
        reps: row.reps,
        rpe: row.rpe == null ? null : Number(row.rpe),
      });
    }

    const fullDraft = buildPlan({
      today: data.today,
      daysPerWeek: profileRes.data?.days_per_week ?? null,
      equipment: profileRes.data?.equipment ?? null,
      exercises,
      historyByExercise,
      checkin: checkinRes.data ?? null,
      postpartum,
      weightUnit: profileRes.data?.weight_unit ?? "kg",
      goal: profileRes.data?.goal ?? null,
      experience: profileRes.data?.experience ?? null,
      sessionMinutes: profileRes.data?.session_minutes ?? null,
    });

    // "day" scope: only the next training day, for when today feels off but the week is fine.
    const draft =
      data.scope === "day"
        ? {
            ...fullDraft,
            days: fullDraft.days.slice(0, 1),
            summary: `Just today's session. ${fullDraft.summary}`,
          }
        : fullDraft;

    const unit = profileRes.data?.weight_unit ?? "kg";

    // Stage 2 — AI writes words only. Numbers stay exactly as the rules set them.
    let summary = draft.summary;
    let rationales: Record<string, string> = {};
    try {
      const { narratePlan } = await import("./plan-narrate.server");
      const narration = await narratePlan(draft);
      if (narration) {
        summary = [narration.summary, ...draft.notes].join(" ");
        rationales = narration.rationales;
      }
    } catch (error) {
      console.error("[plan] narration error", error);
    }

    // Supersede any existing draft for this user (soft delete — rows are never removed).
    await supabase
      .from("plans")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "draft")
      .is("deleted_at", null);

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({ user_id: userId, week_start: draft.week_start, status: "draft", summary })
      .select("id")
      .single();
    if (planError) throw planError;

    const rows = draft.days.flatMap((day) =>
      day.items.map((item, index) => ({
        plan_id: plan.id,
        user_id: userId,
        day_number: day.day_number,
        position: index + 1,
        exercise_id: item.exercise_id,
        sets: item.sets,
        rep_min: item.rep_min,
        rep_max: item.rep_max,
        target_weight: item.target_weight,
        unit: item.unit,
        rationale: rationales[`${day.day_number}-${item.exercise_id}`] ?? item.rationale,
      })),
    );

    const { error: itemsError } = await supabase.from("plan_items").insert(rows);
    if (itemsError) throw itemsError;

    return { planId: plan.id as string | null, blocked: false };
  });

const PlanIdInput = z.object({ planId: z.string().uuid() });

export const approvePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only one approved plan at a time.
    const { error: archiveError } = await supabase
      .from("plans")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "approved");
    if (archiveError) throw archiveError;

    const { error } = await supabase
      .from("plans")
      .update({ status: "approved" })
      .eq("user_id", userId)
      .eq("id", data.planId);
    if (error) throw error;
    return { ok: true };
  });

export const discardPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("plans")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", data.planId)
      .eq("status", "draft");
    if (error) throw error;
    return { ok: true };
  });
