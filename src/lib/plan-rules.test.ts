import { describe, expect, it } from "vitest";
import {
  POSTPARTUM_WARNING_NOTE,
  buildPlan,
  postpartumStatus,
  type PlanExercise,
  type PostpartumInfo,
} from "./plan-rules";

const TODAY = "2026-10-14"; // Wednesday; plan week starts 2026-10-12

const pp = (over: Partial<PostpartumInfo> = {}): PostpartumInfo => ({
  postpartum: true,
  weeks_since_birth: 12,
  weeks_recorded_on: TODAY,
  birth_type: "vaginal",
  cleared: true,
  cleared_on: "2026-06-01",
  ...over,
});

const ex = (id: string, group: string, over: Partial<PlanExercise> = {}): PlanExercise => ({
  id,
  name: id,
  muscle_group: group,
  equipment: "dumbbell",
  is_compound: true,
  weight_step: 2,
  impact_level: "low",
  postpartum_safe: true,
  ...over,
});

const exercises: PlanExercise[] = [
  ex("safe-legs", "Legs"),
  ex("safe-chest", "Chest"),
  ex("unsafe-legs", "Legs", { postpartum_safe: false }),
  ex("moderate-back", "Back", { impact_level: "moderate" }),
  ex("safe-back", "Back"),
];

const topHistory = { "safe-legs": [1, 2, 3].map(() => ({ weight: 20, unit: "kg" as const, reps: 12, rpe: 7 })) };

const plan = (postpartum: PostpartumInfo | null) =>
  buildPlan({
    today: TODAY,
    daysPerWeek: 3,
    equipment: "full_gym",
    exercises,
    historyByExercise: topHistory,
    checkin: null,
    postpartum,
  });

const ids = (p: ReturnType<typeof plan>) => p.days.flatMap((d) => d.items.map((i) => i.exercise_id));

describe("postpartum plan rules", () => {
  it("only picks postpartum-safe, low-impact exercises", () => {
    const picked = new Set(ids(plan(pp())));
    expect(picked.has("unsafe-legs")).toBe(false);
    expect(picked.has("moderate-back")).toBe(false);
    expect(picked.has("safe-legs")).toBe(true);
  });

  it("uses the full library when postpartum is off", () => {
    expect(new Set(ids(plan(null))).has("unsafe-legs")).toBe(true);
  });

  it("blocks the plan when not yet cleared", () => {
    expect(postpartumStatus(pp({ cleared: false }), TODAY)).toEqual({ mode: "blocked", reason: "not_cleared" });
    expect(() => plan(pp({ cleared: false }))).toThrow();
  });

  it("blocks under 6 weeks after a vaginal birth, allows at 6", () => {
    expect(postpartumStatus(pp({ weeks_since_birth: 5 }), TODAY).mode).toBe("blocked");
    expect(postpartumStatus(pp({ weeks_since_birth: 6 }), TODAY).mode).toBe("active");
  });

  it("blocks under 8 weeks after a C-section, allows at 8", () => {
    expect(postpartumStatus(pp({ birth_type: "c_section", weeks_since_birth: 7 }), TODAY).mode).toBe("blocked");
    expect(postpartumStatus(pp({ birth_type: "c_section", weeks_since_birth: 8 }), TODAY).mode).toBe("active");
  });

  it("counts weeks up from the date they were entered", () => {
    expect(postpartumStatus(pp({ weeks_since_birth: 4, weeks_recorded_on: "2026-09-30" }), TODAY).mode).toBe("active");
  });

  it("caps sets at 2 and holds weight in the first 4 plan weeks after clearance", () => {
    const p = plan(pp({ cleared_on: "2026-09-25" })); // cleared week starts 09-21, 3 weeks before
    const items = p.days.flatMap((d) => d.items);
    expect(items.every((i) => i.sets <= 2)).toBe(true);
    const legs = items.find((i) => i.exercise_id === "safe-legs")!;
    expect(legs.target_weight).toBe(20);
  });

  it("allows 3 sets and weight increases from plan week 5 after clearance", () => {
    const p = plan(pp({ cleared_on: "2026-09-14" })); // exactly 4 weeks before
    const legs = p.days.flatMap((d) => d.items).find((i) => i.exercise_id === "safe-legs")!;
    expect(legs.sets).toBe(3);
    expect(legs.target_weight).toBe(22);
  });

  it("adds the stop-and-check note", () => {
    expect(plan(pp()).notes).toContain(POSTPARTUM_WARNING_NOTE);
    expect(plan(null).notes).not.toContain(POSTPARTUM_WARNING_NOTE);
  });
});
