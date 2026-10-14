import { supabase } from "@/integrations/supabase/client";

export type Goal = "strength" | "build_muscle" | "lose_fat" | "general_fitness";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "full_gym" | "dumbbells_only" | "bodyweight_only";
export type Unit = "kg" | "lb";
export type BirthType = "vaginal" | "c_section" | "prefer_not_to_say";

export const BIRTH_TYPES: { value: BirthType; label: string }[] = [
  { value: "vaginal", label: "Vaginal" },
  { value: "c_section", label: "C-section" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: "strength", label: "Get stronger", hint: "Heavier lifts, lower reps" },
  { value: "build_muscle", label: "Build muscle", hint: "Moderate reps, more volume" },
  { value: "lose_fat", label: "Lose fat", hint: "Keep strength, stay active" },
  { value: "general_fitness", label: "General fitness", hint: "Feel good, stay consistent" },
];

export const EXPERIENCES: { value: Experience; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "Under a year of training" },
  { value: "intermediate", label: "Intermediate", hint: "1–3 years, know the lifts" },
  { value: "advanced", label: "Advanced", hint: "3+ years, training seriously" },
];

export const EQUIPMENT: { value: Equipment; label: string; hint: string }[] = [
  { value: "full_gym", label: "Full gym", hint: "Barbells, machines, everything" },
  { value: "dumbbells_only", label: "Dumbbells only", hint: "Home setup with weights" },
  { value: "bodyweight_only", label: "Bodyweight only", hint: "No equipment needed" },
];

export const DAYS = [2, 3, 4, 5, 6] as const;
export const SESSION_MINUTES = [30, 45, 60, 75, 90] as const;

export function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T | null | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? "Not set";
}

export type Profile = {
  id: string;
  display_name: string | null;
  goal: Goal | null;
  experience: Experience | null;
  days_per_week: number | null;
  session_minutes: number | null;
  equipment: Equipment | null;
  weight_unit: Unit;
  postpartum: boolean;
  postpartum_weeks_since_birth: number | null;
  postpartum_weeks_recorded_on: string | null;
  postpartum_birth_type: BirthType | null;
  postpartum_cleared: boolean | null;
  postpartum_cleared_on: string | null;
};

export function postpartumInfoFrom(profile: Profile | null | undefined) {
  if (!profile) return null;
  return {
    postpartum: profile.postpartum,
    weeks_since_birth: profile.postpartum_weeks_since_birth,
    weeks_recorded_on: profile.postpartum_weeks_recorded_on,
    birth_type: profile.postpartum_birth_type,
    cleared: profile.postpartum_cleared,
    cleared_on: profile.postpartum_cleared_on,
  };
}

const COLUMNS =
  "id, display_name, goal, experience, days_per_week, session_minutes, equipment, weight_unit, onboarded_at, postpartum, postpartum_weeks_since_birth, postpartum_weeks_recorded_on, postpartum_birth_type, postpartum_cleared, postpartum_cleared_on";

export async function fetchProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return {
    email: user.email ?? "",
    userId: user.id,
    profile: (data as (Profile & { onboarded_at: string | null }) | null) ?? null,
  };
}

export function isOnboarded(profile: { onboarded_at: string | null } | null | undefined) {
  return Boolean(profile?.onboarded_at);
}

export const profileQueryOptions = {
  queryKey: ["profile"] as const,
  queryFn: fetchProfile,
};
