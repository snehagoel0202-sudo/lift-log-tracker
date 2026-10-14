import { describe, expect, it } from "vitest";
import { buildPlan, parsePainAreas, type PlanExercise } from "./plan-rules";

const ex = (
  id: string,
  muscle_group: string,
  movement_pattern: NonNullable<PlanExercise["movement_pattern"]>,
  impact_level: "low" | "moderate" | "high" = "low",
): PlanExercise => ({
  id, name: id, muscle_group, movement_pattern, impact_level,
  equipment: "dumbbell", is_compound: true, weight_step: 2, postpartum_safe: true,
});

const exercises = [
  ex("squat", "Legs", "squat"),
  ex("lunge", "Legs", "lunge"),
  ex("rdl", "Legs", "hinge"),
  ex("press", "Chest", "push"),
  ex("ohp", "Shoulders", "push"),
  ex("row", "Back", "pull"),
  ex("plank", "Core", "core"),
  ex("jump", "Legs", "squat", "high"),
  ex("step-up", "Legs", "lunge", "moderate"),
  ex("leg-curl", "Legs", "hinge"),
];

const picked = (pain_area: string | null, pain = true) =>
  new Set(
    buildPlan({
      today: "2026-10-14", daysPerWeek: 3, equipment: "full_gym", exercises,
      historyByExercise: {},
      checkin: { sleep: 4, energy: 4, soreness: 1, pain, pain_area },
    }).days.flatMap((d) => d.items.map((i) => i.exercise_id)),
  );

describe("pain area rules", () => {
  it("parses chip lists and ignores unknown text", () => {
    expect(parsePainAreas("Knee, lower back, elbow")).toEqual(["Knee", "Lower back"]);
  });

  it("Knee removes squats and lunges", () => {
    const p = picked("Knee");
    for (const id of ["squat", "lunge", "jump", "step-up"]) expect(p.has(id)).toBe(false);
    expect(p.has("rdl")).toBe(true);
  });

  it("Lower back removes hinges", () => {
    const p = picked("Lower back");
    expect(p.has("rdl")).toBe(false);
    expect(p.has("leg-curl")).toBe(false);
    expect(p.has("squat")).toBe(true);
  });

  it("Shoulder removes pushes, pulls and shoulder exercises", () => {
    const p = picked("Shoulder");
    for (const id of ["press", "ohp", "row"]) expect(p.has(id)).toBe(false);
  });

  for (const area of ["Pelvic floor", "C-section scar"]) {
    it(`${area} removes all core and anything above low impact`, () => {
      const p = picked(area);
      for (const id of ["plank", "jump", "step-up"]) expect(p.has(id)).toBe(false);
      expect(p.has("squat")).toBe(true);
    });
  }

  it("Other removes nothing but keeps the see-a-professional note", () => {
    expect(picked("Other").has("squat")).toBe(true);
    const plan = buildPlan({
      today: "2026-10-14", daysPerWeek: 3, equipment: "full_gym", exercises, historyByExercise: {},
      checkin: { sleep: 4, energy: 4, soreness: 1, pain: true, pain_area: "Other" },
    });
    expect(plan.notes.join(" ")).toContain("check with a professional");
  });

  it("removes nothing when pain is No", () => {
    expect(picked("Knee", false).has("squat")).toBe(true);
  });
});
