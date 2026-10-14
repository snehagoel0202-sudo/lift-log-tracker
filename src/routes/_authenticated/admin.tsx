import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppScreen } from "@/components/AppScreen";
import { ErrorState, LoadingBlock } from "@/components/ScreenState";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LiftLog" },
      { name: "description", content: "Weekly usage and feedback for LiftLog." },
      { property: "og:title", content: "Admin — LiftLog" },
      { property: "og:description", content: "Weekly usage and feedback for LiftLog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const show = (v: number | null) => (v == null ? "—" : `${v}%`);

function Admin() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });

  if (isLoading) return <AppScreen title="Admin"><LoadingBlock /></AppScreen>;
  if (error) return <AppScreen title="Admin"><ErrorState message="Couldn't load stats." /></AppScreen>;
  if (!data?.ok) {
    return (
      <AppScreen title="Admin">
        <p className="text-muted-foreground">This page isn't available.</p>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Admin" subtitle="Weeks start Monday. Sign-up % figures are for that week's new users.">
      <div className="space-y-3">
        {data.weeks.length === 0 ? <p className="text-muted-foreground">No activity yet.</p> : null}
        {data.weeks.map((w) => (
          <div key={w.week} className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">Week of {w.week}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
              <dt>Sign-ups</dt><dd className="text-right text-foreground">{w.signups}</dd>
              <dt>Finished onboarding</dt><dd className="text-right text-foreground">{show(w.onboardedPct)}</dd>
              <dt>Saved 2+ workouts</dt><dd className="text-right text-foreground">{show(w.twoPlusWorkoutsPct)}</dd>
              <dt>Logs saved without correction</dt>
              <dd className="text-right text-foreground">{show(w.logsNoCorrectionPct)} ({w.logsSaved})</dd>
              <dt>Plan generations</dt><dd className="text-right text-foreground">{w.planGenerations}</dd>
            </dl>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-semibold text-foreground">Latest feedback</h2>
      <div className="mt-2 space-y-2">
        {data.feedback.length === 0 ? <p className="text-sm text-muted-foreground">No feedback yet.</p> : null}
        {data.feedback.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="font-semibold text-foreground">
              {"★".repeat(f.rating)}
              <span className="ml-2 font-normal text-muted-foreground">
                {new Date(f.created_at).toLocaleDateString()}
              </span>
            </p>
            {f.message ? <p className="mt-1 text-foreground">{f.message}</p> : null}
          </div>
        ))}
      </div>
    </AppScreen>
  );
}
