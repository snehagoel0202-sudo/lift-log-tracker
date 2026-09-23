import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "@/components/AppScreen";
import { archivedPlansQueryOptions, groupByDay, type Plan } from "@/lib/plans";

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

function ArchivedPlan({ plan }: { plan: Plan }) {
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card/50 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Week of {plan.week_start}
        </p>
        {plan.summary ? <p className="mt-1 text-sm text-foreground">{plan.summary}</p> : null}
      </div>
      <div className="space-y-6">
        {groupByDay(plan.items).map(([day, items]) => (
          <section key={day}>
            <h3 className="display-title mb-2 text-2xl text-foreground">DAY {day}</h3>
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-foreground">
                      {item.exercises?.name ?? "Exercise"}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {item.sets} × {item.rep_min}–{item.rep_max}
                      {item.target_weight != null ? ` · ${item.target_weight} ${item.unit}` : ""}
                    </span>
                  </div>
                  {item.rationale ? (
                    <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function PlanHistoryPage() {
  const archived = useQuery(archivedPlansQueryOptions);

  return (
    <AppScreen title="Past plans" subtitle="Plans you've replaced, kept here for reference.">
      <Link
        to="/plan"
        className="mb-4 inline-block text-sm text-muted-foreground underline underline-offset-4"
      >
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
        <div className="space-y-6">
          {archived.data.map((plan) => (
            <ArchivedPlan key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </AppScreen>
  );
}
