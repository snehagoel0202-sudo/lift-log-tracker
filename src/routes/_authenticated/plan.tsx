import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const approved = useQuery(approvedPlanQueryOptions);
  const draft = useQuery(draftPlanQueryOptions);

  const recommendFn = useServerFn(recommendPlan);
  const approveFn = useServerFn(approvePlan);
  const discardFn = useServerFn(discardPlan);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plan"] });

  const [choosingScope, setChoosingScope] = useState(false);
  const [showApproved, setShowApproved] = useState(false);

  const recommend = useMutation({
    mutationFn: (scope: "day" | "week") =>
      recommendFn({ data: { today: localDateString(), scope } }),
    onSuccess: () => {
      setChoosingScope(false);
      setShowApproved(false);
      invalidate();
    },
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

      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Your current plan
          </p>
          {approved.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading your plan…</p>
          ) : approved.data ? (
            draft.data && !showApproved ? (
              <button
                type="button"
                onClick={() => setShowApproved(true)}
                className="mt-2 flex min-h-14 w-full items-center justify-between rounded-2xl border border-border bg-card px-5 py-3 text-left"
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    Week of {approved.data.week_start}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {approved.data.items.length} exercises · tap to view
                  </span>
                </span>
                <span aria-hidden className="text-muted-foreground">
                  ▾
                </span>
              </button>
            ) : (
              <div className="mt-2 space-y-5">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Week of {approved.data.week_start}
                      </p>
                      {approved.data.summary ? (
                        <p className="mt-1 text-sm text-foreground">{approved.data.summary}</p>
                      ) : null}
                    </div>
                    {draft.data ? (
                      <button
                        type="button"
                        onClick={() => setShowApproved(false)}
                        className="shrink-0 text-sm text-muted-foreground underline underline-offset-4"
                      >
                        Collapse
                      </button>
                    ) : null}
                  </div>
                </div>
                <PlanDays plan={approved.data} />
              </div>
            )
          ) : (
            <div className="mt-2 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="font-semibold text-foreground">No plan yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get a week of workouts suggested from your history.
              </p>
            </div>
          )}
        </div>

        {!draft.data && !choosingScope ? (
          <button
            type="button"
            onClick={() => setChoosingScope(true)}
            disabled={busy}
            className="min-h-14 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {approved.data ? "Recommend a new plan" : "Recommend my plan"}
          </button>
        ) : null}

        {choosingScope ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-semibold text-foreground">What should the new plan cover?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Feeling low on energy today? You can get a lighter session just for today and keep
              your week as it is.
            </p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => recommend.mutate("day")}
                disabled={busy}
                className="min-h-14 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {recommend.isPending && recommend.variables === "day"
                  ? "Building today's session…"
                  : "Just today"}
              </button>
              <button
                type="button"
                onClick={() => recommend.mutate("week")}
                disabled={busy}
                className="min-h-14 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {recommend.isPending && recommend.variables === "week"
                  ? "Building your week…"
                  : "The whole week"}
              </button>
              <button
                type="button"
                onClick={() => setChoosingScope(false)}
                disabled={busy}
                className="min-h-12 w-full rounded-xl border border-border font-semibold text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

      </section>

      {draft.data ? (
        <section className="mt-10 space-y-5">
          <div className="rounded-2xl border border-primary/50 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Suggested plan (not saved yet)
            </p>
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

          <button
            type="button"
            onClick={() => {
              setChoosingScope(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={busy}
            className="min-h-12 w-full rounded-xl border border-border font-semibold text-foreground disabled:opacity-60"
          >
            Suggest a different plan
          </button>
        </section>
      ) : null}

      {failed ? (
        <p className="mt-4 text-sm text-destructive">Something went wrong. Try again.</p>
      ) : null}

      <div className="mt-10 text-center">
        <Link to="/plan-history" className="text-sm text-muted-foreground underline underline-offset-4">
          Past plans
        </Link>
      </div>
    </AppScreen>
  );
}
