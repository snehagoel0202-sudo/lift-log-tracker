import { describe, expect, it } from "vitest";
import { buildPlan, exercisesPerDay, type PlanExercise } from "./plan-rules";

const groups = ["Legs", "Chest", "Back", "Shoulders", "Arms", "Core"];
const exercises: PlanExercise[] = groups.flatMap((g) =>
  [true, false].map((compound) => ({
    id: `${g}-${compound}`, name: `${g} ${compound}`, muscle_group: g, equipment: "barbell" as const,
    is_compound: compound, weight_step: 2.5,
  })),
);

const plan = (over: Parameters<typeof buildPlan>[0] extends infer T ? Partial<T> : never = {}) =>
  buildPlan({
    today: "2026-10-14", daysPerWeek: 3, equipment: "full_gym", exercises,
    historyByExercise: {}, checkin: null, ...over,
  });
const items = (p: ReturnType<typeof plan>) => p.days.flatMap((d) => d.items);
const compound = (id: string) => id.endsWith("-true");

describe("goal, experience and session length", () => {
  it("strength: 4-6 reps and 3-4 sets on compound lifts", () => {
    for (const i of items(plan({ goal: "strength", experience: "intermediate", sessionMinutes: 75 })).filter((i) => compound(i.exercise_id))) {
      expect([i.rep_min, i.rep_max]).toEqual([4, 6]);
      expect(i.sets).toBeGreaterThanOrEqual(3);
      expect(i.sets).toBeLessThanOrEqual(4);
    }
  });

  it("build_muscle: 8-12 reps", () => {
    for (const i of items(plan({ goal: "build_muscle" }))) expect([i.rep_min, i.rep_max]).toEqual([8, 12]);
  });

  it("lose_fat and general_fitness: 10-15 reps", () => {
    for (const goal of ["lose_fat", "general_fitness"] as const)
      for (const i of items(plan({ goal }))) expect([i.rep_min, i.rep_max]).toEqual([10, 15]);
  });

  it("beginner: at most 4 exercises per day and 2-3 sets", () => {
    const p = plan({ experience: "beginner", goal: "strength", sessionMinutes: 90 });
    for (const d of p.days) expect(d.items.length).toBeLessThanOrEqual(4);
    for (const i of items(p)) { expect(i.sets).toBeGreaterThanOrEqual(2); expect(i.sets).toBeLessThanOrEqual(3); }
  });

  it("advanced: up to 6 exercises per day", () => {
    expect(plan({ experience: "advanced", sessionMinutes: 90 }).days[0]!.items.length).toBe(6);
  });

  it("session length caps exercises: 30->3, 45->4, 60->5, 75+->6", () => {
    expect(exercisesPerDay(30, "advanced")).toBe(3);
    expect(exercisesPerDay(45, "advanced")).toBe(4);
    expect(exercisesPerDay(60, "advanced")).toBe(5);
    expect(exercisesPerDay(75, "advanced")).toBe(6);
    expect(exercisesPerDay(90, "advanced")).toBe(6);
    expect(plan({ sessionMinutes: 30, experience: "advanced" }).days[0]!.items.length).toBe(3);
  });
});
