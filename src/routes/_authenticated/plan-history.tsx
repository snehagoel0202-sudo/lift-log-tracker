import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "@/components/AppScreen";
import { archivedPlansQueryOptions, fetchPlanById, groupByDay, type PlanItem } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/plan-history")({
  head: () => ({
    meta: [
      { title: "Past plans — LiftLog" },
      { name: "description", content: "Your archived training plans in LiftLog." },
      { property: "og:title", content: "Past plans — LiftLog" },
      { property: "og:description", content: "Your archived training plans in LiftLog." },
    ],
  }),
  component: PlanHistoryPage,
});

function PlanHistoryPage() {
  const params = useParams({ strict: false }) as { planId?: string };
  const archived = useQuery(archivedPlansQueryOptions);

  if (params.planId) {
    return <ArchivedPlanDetail planId={params.planId} />;
  }

  return (
    <AppScreen title="Past plans" subtitle="Plans you've replaced, kept here for reference.">
      <Link to="/plan" className="mb-4 inline-block text-sm text-muted-foreground underline underline-offset-4">
        ← Back to Plan
      </Link>
      {archived.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading past plans…</p>
      ) : !archived.data?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold text-foreground">No past plans</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you approve a new plan, the old one moves here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {archived.data.map((plan) => (
            <li key={plan.id}>
              <Link
                to="/plan-history"
                className="flex min-h-16 items-center justify-between rounded-2xl border border-border bg-card px-5 py-3"
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-foreground">Week of {plan.week_start}</span>
                  {plan.summary ? (
                    <span className="line-clamp-2 text-sm text-muted-foreground">{plan.summary}</span>
                  ) : null}
                </span>
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppScreen>
  );
}
