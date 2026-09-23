import { supabase } from "@/integrations/supabase/client";

export type ExerciseEquipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";
export type ImpactLevel = "low" | "moderate" | "high";
export type MovementPattern = "squat" | "hinge" | "push" | "pull" | "lunge" | "carry" | "core";

export type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  muscle_group: string;
  equipment: ExerciseEquipment;
  is_compound: boolean;
  weight_step: number;
  impact_level: ImpactLevel;
  postpartum_safe: boolean;
  movement_pattern: MovementPattern;
  variation_of: string | null;
};

export const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  push: "Push",
  pull: "Pull",
  lunge: "Lunge",
  carry: "Carry",
  core: "Core",
};

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
};

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, name, aliases, muscle_group, equipment, is_compound, weight_step, impact_level, postpartum_safe, movement_pattern, variation_of",
    )
    .order("muscle_group")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    weight_step: Number(row.weight_step),
  })) as Exercise[];
}

export const exercisesQueryOptions = {
  queryKey: ["exercises"] as const,
  queryFn: fetchExercises,
};

export function matchesSearch(exercise: Exercise, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    exercise.name.toLowerCase().includes(q) ||
    exercise.muscle_group.toLowerCase().includes(q) ||
    EQUIPMENT_LABELS[exercise.equipment].toLowerCase().includes(q) ||
    exercise.aliases.some((alias) => alias.toLowerCase().includes(q))
  );
}
