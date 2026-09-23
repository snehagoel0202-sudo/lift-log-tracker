import { supabase } from "@/integrations/supabase/client";

export type PlanSession = { id: string; date: string; notes: string | null };

/** Sessions logged from this plan since its week start, oldest first. */
export function planSessionsQueryOptions(planId: string | null, weekStart: string | null) {
  return {
    queryKey: ["plan-sessions", planId, weekStart] as const,
    enabled: Boolean(planId && weekStart),
    queryFn: async (): Promise<PlanSession[]> => {
      if (!planId || !weekStart) return [];
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, date, notes")
        .eq("user_id", userData.user.id)
        .eq("plan_id", planId)
        .gte("date", weekStart)
        .is("deleted_at", null)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanSession[];
    },
  };
}
