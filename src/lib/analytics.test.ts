import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const { EVENT_NAMES, sanitizeProps } = await import("./analytics");
const { weeklyStats } = await import("./admin-stats");

const latestMigrationWith = (needle: string) => {
  const dir = "drizzle/migrations";
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const sql = files.map((f) => readFileSync(`${dir}/${f}`, "utf8")).filter((s) => s.includes(needle));
  return sql[sql.length - 1]!;
};

describe("analytics events", () => {
  it("tracks exactly the eight agreed event names", () => {
    expect([...EVENT_NAMES]).toEqual([
      "signed_up",
      "onboarding_completed",
      "postpartum_mode_on",
      "checkin_saved",
      "log_reviewed",
      "log_corrected",
      "log_saved",
      "plan_generated",
    ]);
  });

  it("the database only accepts the same event names", () => {
    const sql = latestMigrationWith("CREATE TABLE public.events");
    for (const name of EVENT_NAMES) expect(sql).toContain(`'${name}'`);
  });

  it("strips health details from props", () => {
    expect(
      sanitizeProps({ notes: "sore", pain_area: "knee", postpartum: true, weeks: 6, sets: 3 }),
    ).toEqual({ sets: 3 });
    expect(sanitizeProps({ free: "any text" })).toBeNull();
  });

  it("counts logs saved without a correction", () => {
    const at = "2026-10-14T10:00:00Z";
    const stats = weeklyStats(
      [
        { user_id: "a", name: "log_saved", created_at: at, props: { corrections: 0 } },
        { user_id: "a", name: "log_saved", created_at: at, props: { corrections: 2 } },
      ],
      [],
    );
    expect(stats[0]!.logsNoCorrectionPct).toBe(50);
  });
});

describe("account deletion", () => {
  const sql = latestMigrationWith("FUNCTION public.delete_account_permanently");
  it("permanently removes the person's events", () => {
    expect(sql).toContain("DELETE FROM public.events WHERE user_id = _user_id");
  });
  it("permanently removes the person's feedback", () => {
    expect(sql).toContain("DELETE FROM public.feedback WHERE user_id = _user_id");
  });
  it("removes events and feedback before the sign-in account", () => {
    const authAt = sql.indexOf("DELETE FROM auth.users");
    expect(sql.indexOf("DELETE FROM public.events")).toBeLessThan(authAt);
    expect(sql.indexOf("DELETE FROM public.feedback")).toBeLessThan(authAt);
  });
});
