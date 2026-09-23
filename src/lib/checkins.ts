import { supabase } from "@/integrations/supabase/client";

export type Checkin = {
  id: string;
  date: string;
  sleep: number | null;
  energy: number | null;
  soreness: number | null;
  pain: boolean;
  pain_area: string | null;
  notes: string | null;
};

/** Device-local date as YYYY-MM-DD (never UTC). */
export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const COLUMNS = "id, date, sleep, energy, soreness, pain, pain_area, notes";

export async function fetchTodayCheckin(date: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("checkins")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .eq("date", date)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as Checkin | null) ?? null;
}

export function checkinQueryOptions(date: string) {
  return {
    queryKey: ["checkin", date] as const,
    queryFn: () => fetchTodayCheckin(date),
  };
}

export type CheckinInput = {
  sleep: number | null;
  energy: number | null;
  soreness: number | null;
  pain: boolean;
  pain_area: string | null;
  notes: string | null;
};

export async function saveCheckin(date: string, input: CheckinInput) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("checkins")
    .upsert(
      { user_id: user.id, date, ...input, deleted_at: null },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}

export const SCALE = [1, 2, 3, 4, 5] as const;

export const SLEEP_FACES = ["😴", "🥱", "😐", "🙂", "😃"];
export const ENERGY_FACES = ["🪫", "😕", "😐", "💪", "⚡"];
export const SORENESS_FACES = ["😌", "🙂", "😐", "😣", "😖"];

export const PAIN_NOTE =
  "Take it easy today. If the pain is sharp or doesn’t go away, check with a professional.";
