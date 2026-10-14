import { describe, expect, it } from "vitest";
import { buildPlan, type PlanExercise } from "./plan-rules";

const squat: PlanExercise = {
  id: "squat", name: "Back Squat", muscle_group: "Legs", equipment: "barbell",
  is_compound: true, weight_step: 2.5, movement_pattern: "squat", impact_level: "moderate",
};

const target = (weightUnit: "kg" | "lb") =>
  buildPlan({
    today: "2026-10-14", daysPerWeek: 3, equipment: "full_gym", exercises: [squat],
    historyByExercise: {
      squat: [
        { weight: 60, unit: "kg", reps: 12, rpe: 7 },
        { weight: 100, unit: "lb", reps: 12, rpe: 7 },
      ],
    },
    checkin: null, weightUnit,
  }).days[0]!.items[0]!;

describe("unit handling in progression", () => {
  it("60 kg then 100 lb never prescribes above 62.5 kg", () => {
    const item = target("kg");
    expect(item.unit).toBe("kg");
    expect(item.target_weight!).toBeLessThanOrEqual(62.5);
  });

  it("prescribes in the profile unit, rounded to the weight step", () => {
    const item = target("lb");
    expect(item.unit).toBe("lb");
    expect(item.target_weight! % 2.5).toBe(0);
  });

  it("new lifts use the profile unit", () => {
    const item = buildPlan({
      today: "2026-10-14", daysPerWeek: 3, equipment: "full_gym", exercises: [squat],
      historyByExercise: {}, checkin: null, weightUnit: "lb",
    }).days[0]!.items[0]!;
    expect(item.unit).toBe("lb");
    expect(item.target_weight).toBeNull();
  });
});
