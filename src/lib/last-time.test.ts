import { describe, expect, it } from "vitest";
import {
  applySameAsLastTime,
  emptyRow,
  formatLastTime,
  lastTime,
  setsToSave,
  toUnit,
  typeField,
  type PastSession,
} from "./last-time";

const set = (n: number, weight: number | null, reps: number | null, unit: "kg" | "lb" = "kg", extra = {}) => ({
  exercise_id: "squat",
  set_number: n,
  weight,
  unit,
  reps,
  ...extra,
});

describe("last-time lookup", () => {
  it("picks the most recent non-deleted session with that exercise", () => {
    const sessions: PastSession[] = [
      { id: "old", date: "2026-10-05", sets: [set(1, 35, 10)] },
      { id: "hidden", date: "2026-10-14", deleted_at: "2026-10-14T10:00:00Z", sets: [set(1, 99, 1)] },
      { id: "other", date: "2026-10-13", sets: [{ ...set(1, 20, 10), exercise_id: "bench" }] },
      { id: "hiddenSets", date: "2026-10-13", sets: [set(1, 88, 1, "kg", { deleted_at: "x" })] },
      { id: "recent", date: "2026-10-12", sets: [set(2, 40, 10), set(1, 40, 10), set(3, 42.5, 8)] },
    ];
    const last = lastTime(sessions, "squat")!;
    expect(last.id).toBe("recent");
    expect(formatLastTime(last, "kg")).toBe("Oct 12 · 40 kg × 10, 40 × 10, 42.5 × 8");
  });

  it("returns nothing for an exercise never logged", () => {
    expect(lastTime([{ id: "a", date: "2026-10-01", sets: [set(1, 40, 10)] }], "deadlift")).toBeNull();
  });
});

describe("unit conversion", () => {
  it("converts to the profile unit", () => {
    expect(toUnit(100, "lb", "kg")).toBe(45.5);
    expect(toUnit(40, "kg", "lb")).toBe(88);
    expect(toUnit(42.5, "kg", "kg")).toBe(42.5);
  });
  it("shows converted weights in the last-time line", () => {
    const last = lastTime([{ id: "a", date: "2026-10-12", sets: [set(1, 100, 8, "lb")] }], "squat")!;
    expect(formatLastTime(last, "kg")).toBe("Oct 12 · 45.5 kg × 8");
  });
});

describe("same as last time", () => {
  it("copied sets are not saved until ticked", () => {
    const rows = applySameAsLastTime([emptyRow(), emptyRow()], [set(1, 40, 10), set(2, 42.5, 8)], "kg");
    expect(rows[0]).toMatchObject({ weight: "40", reps: "10", done: false });
    expect(setsToSave(rows)).toEqual([]);
    rows[1] = { ...rows[1]!, done: true };
    expect(setsToSave(rows)).toEqual([{ set_number: 2, weight: 42.5, reps: 8, rpe: null }]);
  });
  it("never overwrites typed values", () => {
    const typed = { ...emptyRow(), weight: "50", weightEdited: true };
    const [row] = applySameAsLastTime([typed], [set(1, 40, 10)], "kg");
    expect(row).toMatchObject({ weight: "50", reps: "10" });
  });
});

describe("forward-fill", () => {
  for (const field of ["weight", "reps"] as const) {
    const autoFlag = field === "weight" ? "weightAuto" : "repsAuto";

    it(`${field}: typing 4 then 40 updates auto-filled sets`, () => {
      const first = typeField([emptyRow(), emptyRow(), emptyRow()], 0, field, "4");
      const next = typeField(first, 0, field, "40");
      expect(next.map((row) => row[field])).toEqual(["40", "40", "40"]);
      expect(next.map((row) => row[autoFlag])).toEqual([false, true, true]);
    });

    it(`${field}: backspacing 40 to 4 updates auto-filled sets`, () => {
      const first = typeField([emptyRow(), emptyRow(), emptyRow()], 0, field, "40");
      expect(typeField(first, 0, field, "4").map((row) => row[field])).toEqual(["4", "4", "4"]);
    });

    it(`${field}: manual entry clears the auto flag and is never overwritten`, () => {
      let rows = typeField([emptyRow(), emptyRow(), emptyRow()], 0, field, "4");
      rows = typeField(rows, 1, field, "50");
      expect(rows[1]?.[autoFlag]).toBe(false);
      expect(typeField(rows, 0, field, "40").map((row) => row[field])).toEqual(["40", "50", "40"]);
    });

    it(`${field}: ticked auto-filled sets are never overwritten`, () => {
      const rows = typeField([emptyRow(), emptyRow(), emptyRow()], 0, field, "4");
      const next = rows.map((row, index) => index === 1 ? { ...row, done: true } : row);
      expect(typeField(next, 0, field, "40").map((row) => row[field])).toEqual(["40", "4", "40"]);
    });

    it(`${field}: clearing the source clears only eligible auto-filled fields`, () => {
      let rows = typeField([emptyRow(), emptyRow(), emptyRow(), emptyRow()], 0, field, "40");
      rows = typeField(rows, 1, field, "50");
      rows = rows.map((row, index) => index === 2 ? { ...row, done: true } : row);
      const next = typeField(rows, 0, field, "");
      expect(next.map((row) => row[field])).toEqual(["", "50", "50", ""]);
      expect(next[3]?.[autoFlag]).toBe(false);
    });
  }

  it("fills only later empty sets, skipping typed and ticked ones", () => {
    const rows = [
      emptyRow(),
      emptyRow(),
      { ...emptyRow(), weight: "30", weightEdited: true },
      { ...emptyRow(), done: true },
      emptyRow(),
    ];
    const out = typeField(rows, 1, "weight", "45");
    expect(out.map((r) => r.weight)).toEqual(["", "45", "30", "", "45"]);
    expect(out.map((r) => r.reps)).toEqual(["", "", "", "", ""]);
  });
});
