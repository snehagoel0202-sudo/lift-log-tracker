import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { weeklyStats } from "@/lib/admin-stats";

export function isAdminEmail(email: unknown) {
  const admin = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  return Boolean(admin && typeof email === "string" && email.trim().toLowerCase() === admin);
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ admin: isAdminEmail(context.claims.email) }));

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdminEmail(context.claims.email)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [events, sessions, feedback] = await Promise.all([
      supabaseAdmin.from("events").select("user_id, name, created_at, props").limit(50000),
      supabaseAdmin.from("workout_sessions").select("user_id").is("deleted_at", null).limit(50000),
      supabaseAdmin
        .from("feedback")
        .select("id, rating, message, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (events.error || sessions.error || feedback.error) throw new Error("Couldn't load stats");
    return {
      ok: true as const,
      weeks: weeklyStats(events.data, sessions.data),
      feedback: feedback.data,
    };
  });
