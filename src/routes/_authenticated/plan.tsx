import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppScreen } from "@/components/AppScreen";
import { localDateString } from "@/lib/checkins";
import { approvePlan, discardPlan, recommendPlan } from "@/lib/plans.functions";
import {
  approvedPlanQueryOptions,
  draftPlanQueryOptions,
  groupByDay,
  type Plan,
  type PlanItem,
} from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan — LiftLog" },
      { name: "description", content: "Your recommended training week in LiftLog." },
      { property: "og:title", content: "Plan — LiftLog" },
      { property: "og:description", content: "Your recommended training week in LiftLog." },
    ],
  }),
  component: PlanPage,
});

function ItemRow({ item }: { item: PlanItem }) {
  return (
    <li className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-foreground">{item.exercises?.name ?? "Exercise"}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {item.sets} × {item.rep_min}–{item.rep_max}
          {item.target_weight != null ? ` · ${item.target_weight} ${item.unit}` : ""}
        </span>
      </div>
      {item.rationale ? (
        <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>
      ) : null}
    </li>
  );
}

function PlanDays({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-6">
      {groupByDay(plan.items).map(([day, items]) => (
        <section key={day}>
          <h3 className="display-title mb-2 text-2xl text-foreground">DAY {day}</h3>
          <ul className="space-y-3">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PlanPage() {
  const queryClient = useQueryClient();
  const draft = useQuery(draftPlanQueryOptions);
  const approved = useQuery(approvedPlanQueryOptions);

  const recommendFn = useServerFn(recommendPlan);
  const approveFn = useServerFn(approvePlan);
  const discardFn = useServerFn(discardPlan);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plan"] });

  const recommend = useMutation({
    mutationFn: () => recommendFn({ data: { today: localDateString() } }),
    onSuccess: invalidate,
  });
  const approve = useMutation({
    mutationFn: (planId: string) => approveFn({ data: { planId } }),
    onSuccess: invalidate,
  });
  const discard = useMutation({
    mutationFn: (planId: string) => discardFn({ data: { planId } }),
    onSuccess: invalidate,
  });

  const busy = recommend.isPending || approve.isPending || discard.isPending;
  const failed = recommend.isError || approve.isError || discard.isError;

  return (
    <AppScreen title="Plan" subtitle="A training week built from your history and today's check-in.">
      <Link
        to="/library"
        className="mb-4 flex min-h-16 items-center justify-between rounded-2xl border border-border bg-card px-5 py-3"
      >
        <span className="flex flex-col">
          <span className="font-semibold text-foreground">Exercise library</span>
          <span className="text-sm text-muted-foreground">Browse and search every exercise</span>
        </span>
        <span aria-hidden className="text-muted-foreground">
          →
        </span>
      </Link>

      {draft.data ? (
        <section className="space-y-5">
          <div className="rounded-2xl border border-primary/50 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Draft plan</p>
            <p className="mt-1 text-sm text-foreground">{draft.data.summary}</p>
          </div>

          <PlanDays plan={draft.data} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => discard.mutate(draft.data!.id)}
              disabled={busy}
              className="min-h-12 flex-1 rounded-xl border border-border font-semibold text-foreground disabled:opacity-60"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => approve.mutate(draft.data!.id)}
              disabled={busy}
              className="min-h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {approve.isPending ? "Approving…" : "Approve plan"}
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          {approved.data ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Your plan · week of {approved.data.week_start}
                </p>
                <p className="mt-1 text-sm text-foreground">{approved.data.summary}</p>
              </div>
              <PlanDays plan={approved.data} />
            </div>
          ) : draft.isLoading || approved.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your plan…</p>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="font-semibold text-foreground">No plan yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get a week of workouts suggested from your history.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => recommend.mutate()}
            disabled={busy}
            className="min-h-14 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {recommend.isPending ? "Building your plan…" : "Recommend my plan"}
          </button>
        </section>
      )}

      {failed ? (
        <p className="mt-4 text-sm text-destructive">Something went wrong. Try again.</p>
      ) : null}
    </AppScreen>
  );
}
