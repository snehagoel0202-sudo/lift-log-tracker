import { supabase } from "@/integrations/supabase/client";

/** The only event names LiftLog records. The database rejects anything else too. */
export const EVENT_NAMES = [
  "signed_up",
  "onboarding_completed",
  "postpartum_mode_on",
  "checkin_saved",
  "log_reviewed",
  "log_corrected",
  "log_saved",
  "plan_generated",
  "last_time_viewed",
  "history_opened",
  "same_as_last_time_used",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Props are limited to small non-health values (counts, short labels). */
export type EventProps = Record<string, number | boolean | "day" | "week">;

/** Keys that must never be sent, even if a caller passes them. */
const BANNED_KEY = /note|pain|area|postpartum|birth|cleared|weeks|sleep|energy|soreness|text|message|weight|rpe/i;

export function sanitizeProps(props?: Record<string, unknown>): EventProps | null {
  if (!props) return null;
  const out: EventProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (BANNED_KEY.test(key)) continue;
    if (typeof value === "number" || typeof value === "boolean" || value === "day" || value === "week") {
      out[key] = value as EventProps[string];
    }
  }
  return Object.keys(out).length ? out : null;
}

/** Fire-and-forget. Never throws, never blocks the UI. */
export async function track(name: EventName, props?: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("events").insert({
      user_id: data.user.id,
      name,
      props: sanitizeProps(props),
    });
  } catch {
    // Analytics must never break the app.
  }
}
