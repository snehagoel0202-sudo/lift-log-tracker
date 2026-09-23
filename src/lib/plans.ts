import { supabase } from "@/integrations/supabase/client";

export type PlanStatus = "draft" | "approved" | "archived";

export type PlanItem = {
  id: string;
  day_number: number;
  position: number;
  sets: number;
  rep_min: number;
  rep_max: number;
  target_weight: number | null;
  unit: "kg" | "lb";
  rationale: string | null;
  exercises: { name: string; muscle_group: string } | null;
};

export type Plan = {
  id: string;
  week_start: string;
  status: PlanStatus;
  summary: string | null;
  items: PlanItem[];
};

async function fetchPlanByStatus(status: PlanStatus): Promise<Plan | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, week_start, status, summary, plan_items(id, day_number, position, exercise_id, sets, rep_min, rep_max, target_weight, unit, rationale, exercises(name, muscle_group))",
    )
    .eq("user_id", userData.user.id)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const items = ((data as unknown as { plan_items: PlanItem[] }).plan_items ?? [])
    .map((item) => ({
      ...item,
      target_weight: item.target_weight == null ? null : Number(item.target_weight),
    }))
    .sort((a, b) => a.day_number - b.day_number || a.position - b.position);
  return {
    id: data.id,
    week_start: data.week_start,
    status: data.status as PlanStatus,
    summary: data.summary,
    items,
  };
}

export const draftPlanQueryOptions = {
  queryKey: ["plan", "draft"] as const,
  queryFn: () => fetchPlanByStatus("draft"),
};

export const approvedPlanQueryOptions = {
  queryKey: ["plan", "approved"] as const,
  queryFn: () => fetchPlanByStatus("approved"),
};

export const archivedPlansQueryOptions = {
  queryKey: ["plan", "archived"] as const,
  queryFn: async (): Promise<Plan[]> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    const { data, error } = await supabase
      .from("plans")
      .select(
        "id, week_start, status, summary, plan_items(id, day_number, position, exercise_id, sets, rep_min, rep_max, target_weight, unit, rationale, exercises(name, muscle_group))",
      )
      .eq("user_id", userData.user.id)
      .eq("status", "archived")
      .order("week_start", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const items = ((row as unknown as { plan_items: PlanItem[] }).plan_items ?? [])
        .map((item) => ({
          ...item,
          target_weight: item.target_weight == null ? null : Number(item.target_weight),
        }))
        .sort((a, b) => a.day_number - b.day_number || a.position - b.position);
      return {
        id: row.id,
        week_start: row.week_start,
        status: row.status as PlanStatus,
        summary: row.summary,
        items,
      };
    });
  },
};

export async function fetchPlanById(planId: string): Promise<Plan | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, week_start, status, summary, plan_items(id, day_number, position, exercise_id, sets, rep_min, rep_max, target_weight, unit, rationale, exercises(name, muscle_group))",
    )
    .eq("user_id", userData.user.id)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const items = ((data as unknown as { plan_items: PlanItem[] }).plan_items ?? [])
    .map((item) => ({
      ...item,
      target_weight: item.target_weight == null ? null : Number(item.target_weight),
    }))
    .sort((a, b) => a.day_number - b.day_number || a.position - b.position);
  return {
    id: data.id,
    week_start: data.week_start,
    status: data.status as PlanStatus,
    summary: data.summary,
    items,
  };
}

export function groupByDay(items: PlanItem[]) {
  const days = new Map<number, PlanItem[]>();
  for (const item of items) {
    const list = days.get(item.day_number) ?? [];
    list.push(item);
    days.set(item.day_number, list);
  }
  return [...days.entries()].sort((a, b) => a[0] - b[0]);
}
