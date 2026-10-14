export type EventRow = { user_id: string; name: string; created_at: string; props: unknown };
export type SessionRow = { user_id: string };

export type WeekStats = {
  week: string;
  signups: number;
  onboardedPct: number | null;
  twoPlusWorkoutsPct: number | null;
  logsSaved: number;
  logsNoCorrectionPct: number | null;
  planGenerations: number;
};

/** Monday (UTC) of the week containing the timestamp, as YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

/**
 * Sign-up cohorts by week: of the people who signed up that week, how many finished onboarding
 * and how many have saved 2+ workouts. Log and plan counts are by the week they happened.
 */
export function weeklyStats(events: EventRow[], sessions: SessionRow[]): WeekStats[] {
  const onboarded = new Set(events.filter((e) => e.name === "onboarding_completed").map((e) => e.user_id));
  const sessionsPerUser = new Map<string, number>();
  for (const s of sessions) sessionsPerUser.set(s.user_id, (sessionsPerUser.get(s.user_id) ?? 0) + 1);

  const weeks = new Map<string, { signups: Set<string>; logs: number; clean: number; plans: number }>();
  const bucket = (w: string) => {
    let b = weeks.get(w);
    if (!b) weeks.set(w, (b = { signups: new Set(), logs: 0, clean: 0, plans: 0 }));
    return b;
  };

  for (const e of events) {
    const b = bucket(weekStart(e.created_at));
    if (e.name === "signed_up") b.signups.add(e.user_id);
    if (e.name === "plan_generated") b.plans += 1;
    if (e.name === "log_saved") {
      b.logs += 1;
      const corrections = (e.props as { corrections?: unknown } | null)?.corrections;
      if (!corrections) b.clean += 1;
    }
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([week, b]) => {
      const users = [...b.signups];
      return {
        week,
        signups: users.length,
        onboardedPct: pct(users.filter((u) => onboarded.has(u)).length, users.length),
        twoPlusWorkoutsPct: pct(users.filter((u) => (sessionsPerUser.get(u) ?? 0) >= 2).length, users.length),
        logsSaved: b.logs,
        logsNoCorrectionPct: pct(b.clean, b.logs),
        planGenerations: b.plans,
      };
    });
}
