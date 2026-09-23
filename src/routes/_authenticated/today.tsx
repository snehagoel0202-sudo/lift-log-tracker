import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppScreen } from "@/components/AppScreen";
import { CheckinCard } from "@/components/CheckinCard";
import { DemoVideo } from "@/components/DemoVideo";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/ScreenState";
import { localDateString } from "@/lib/checkins";
import { approvedPlanQueryOptions, groupByDay, type PlanItem } from "@/lib/plans";
import { planSessionsQueryOptions } from "@/lib/workouts";
import { saveWorkout } from "@/lib/workouts.functions";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — LiftLog" },
      { name: "description", content: "Your training for today in LiftLog." },
      { property: "og:title", content: "Today — LiftLog" },
      { property: "og:description", content: "Your training for today in LiftLog." },
    ],
  }),
  component: Today,
});

type SetRow = {
  done: boolean;
  weight: string;
  reps: string;
  rpe: string;
  weightEdited: boolean;
  repsEdited: boolean;
};

function rowsForItem(item: PlanItem): SetRow[] {
  return Array.from({ length: item.sets }, () => ({
    done: false,
    weight: item.target_weight == null ? "" : String(item.target_weight),
    reps: String(item.rep_max),
    rpe: "",
    weightEdited: false,
    repsEdited: false,
  }));
}

const inputClass =
  "h-12 w-full min-w-0 rounded-xl border border-border bg-background px-1.5 text-center text-base text-foreground";

function Today() {
  const today = localDateString();
  const queryClient = useQueryClient();
  const planQuery = useQuery(approvedPlanQueryOptions);
  const plan = planQuery.data ?? null;
  const sessionsQuery = useQuery(
    planSessionsQueryOptions(plan?.id ?? null, plan?.week_start ?? null),
  );

  const days = useMemo(() => (plan ? groupByDay(plan.items) : []), [plan]);
  const doneThisWeek = sessionsQuery.data?.length ?? 0;
  const suggestedDay = days.length ? days[doneThisWeek % days.length]![0] : null;

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [rows, setRows] = useState<Record<string, SetRow[]>>({});
  const [reviewing, setReviewing] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const dayNumber = selectedDay ?? suggestedDay;
  const items = useMemo(
    () => days.find(([day]) => day === dayNumber)?.[1] ?? [],
    [days, dayNumber],
  );

  useEffect(() => {
    if (!items.length) return;
    setRows(Object.fromEntries(items.map((item) => [item.id, rowsForItem(item)])));
    setReviewing(false);
  }, [items]);

  const save = useMutation({
    mutationFn: useServerFn(saveWorkout),
    onSuccess: async (result: { saved: number }) => {
      setSavedCount(result.saved);
      setReviewing(false);
      setRows(Object.fromEntries(items.map((item) => [item.id, rowsForItem(item)])));
      await queryClient.invalidateQueries({ queryKey: ["plan-sessions"] });
    },
  });

  const checked = items.flatMap((item) =>
    (rows[item.id] ?? [])
      .map((row, index) => ({ item, row, setNumber: index + 1 }))
      .filter((entry) => entry.row.done),
  );

  function update(itemId: string, index: number, patch: Partial<SetRow>) {
    setSavedCount(null);
    setRows((current) => {
      const list = [...(current[itemId] ?? [])];
      const row = { ...list[index]!, ...patch };
      if (patch.weight !== undefined) row.weightEdited = true;
      if (patch.reps !== undefined) row.repsEdited = true;
      list[index] = row;
      // Carry an edited value down to later sets the user hasn't touched.
      if (patch.weight !== undefined) {
        for (let j = index + 1; j < list.length; j++) {
          if (!list[j]!.weightEdited) list[j] = { ...list[j]!, weight: row.weight };
        }
      }
      if (patch.reps !== undefined) {
        for (let j = index + 1; j < list.length; j++) {
          if (!list[j]!.repsEdited) list[j] = { ...list[j]!, reps: row.reps };
        }
      }
      return { ...current, [itemId]: list };
    });
  }

  if (planQuery.isLoading) {
    return (
      <AppScreen title="Today">
        <CheckinCard />
        <LoadingBlock lines={4} label="Loading your workout" />
      </AppScreen>
    );
  }

  if (planQuery.isError) {
    return (
      <AppScreen title="Today">
        <CheckinCard />
        <ErrorState
          message="We couldn't load today's workout."
          onRetry={() => planQuery.refetch()}
          retrying={planQuery.isFetching}
        />
      </AppScreen>
    );
  }

  if (!plan) {
    return (
      <AppScreen title="Today" subtitle="No approved plan yet.">
        <CheckinCard />
        <EmptyState
          title="You don't have a plan yet"
          hint="Build a weekly plan first, then your sessions show up here."
        >
          <Link
            to="/plan"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground"
          >
            Go to Plan
          </Link>
        </EmptyState>
      </AppScreen>
    );
  }

  if (reviewing) {
    return (
      <AppScreen title="Review" subtitle="Nothing is saved until you tap Save workout.">
        {checked.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't ticked any sets yet.</p>
        ) : (
          <ul className="space-y-2">
            {checked.map(({ item, row, setNumber }) => (
              <li
                key={`${item.id}-${setNumber}`}
                className="flex items-baseline justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="font-semibold text-foreground">
                  {item.exercises?.name ?? "Exercise"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    Set {setNumber}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {row.weight ? `${row.weight} ${item.unit}` : "— "} · {row.reps || "—"} reps
                  {row.rpe ? ` · RPE ${row.rpe}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        {save.isError ? (
          <p className="mt-4 text-sm text-destructive">
            Couldn't save that. Please try again.
          </p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="h-12 flex-1 rounded-xl border border-border font-semibold text-foreground"
          >
            Back
          </button>
          <button
            type="button"
            disabled={checked.length === 0 || save.isPending}
            onClick={() =>
              save.mutate({
                data: {
                  plan_id: plan.id,
                  day_number: dayNumber!,
                  date: today,
                  sets: checked.map(({ item, row, setNumber }) => ({
                    exercise_id: item.exercise_id,
                    set_number: setNumber,
                    weight: row.weight.trim() === "" ? null : Number(row.weight),
                    reps: row.reps.trim() === "" ? null : Number(row.reps),
                    rpe: row.rpe.trim() === "" ? null : Number(row.rpe),
                  })),
                },
              })
            }
            className="h-12 flex-[2] rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save workout"}
          </button>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="Today" subtitle={`Week of ${plan.week_start}`}>
      <CheckinCard />

      {savedCount != null ? (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
          Workout saved — {savedCount} {savedCount === 1 ? "set" : "sets"} logged. Nice work.
        </div>
      ) : null}

      <label className="mb-5 block">
        <span className="mb-1 block text-sm text-muted-foreground">Workout day</span>
        <select
          value={dayNumber ?? ""}
          onChange={(event) => setSelectedDay(Number(event.target.value))}
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-base text-foreground"
        >
          {days.map(([day]) => (
            <option key={day} value={day}>
              Day {day}
              {day === suggestedDay ? " (today)" : ""}
            </option>
          ))}
        </select>
      </label>

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-foreground">
                {item.exercises?.name ?? "Exercise"}
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {item.rep_min}–{item.rep_max} reps
              </span>
            </div>

            <DemoVideo exerciseName={item.exercises?.name} />


            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-11 shrink-0" />
                <span className="flex-1 text-center">{item.unit}</span>
                <span className="flex-1 text-center">Reps</span>
                <span className="flex-1 text-center">RPE</span>
                <span className="w-11 shrink-0" />
              </div>
              {(rows[item.id] ?? []).map((row, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <label className="flex h-12 w-11 shrink-0 items-center justify-center rounded-lg border border-border">
                    <input
                      type="checkbox"
                      aria-label={`Set ${index + 1} done`}
                      checked={row.done}
                      onChange={(event) => update(item.id, index, { done: event.target.checked })}
                      className="h-6 w-6 rounded accent-primary"
                    />
                  </label>
                  <input
                    inputMode="decimal"
                    value={row.weight}
                    aria-label={`Set ${index + 1} weight`}
                    onChange={(event) => update(item.id, index, { weight: event.target.value })}
                    className={inputClass}
                  />
                  <input
                    inputMode="numeric"
                    value={row.reps}
                    aria-label={`Set ${index + 1} reps`}
                    onChange={(event) => update(item.id, index, { reps: event.target.value })}
                    className={inputClass}
                  />
                  <input
                    inputMode="decimal"
                    value={row.rpe}
                    placeholder="–"
                    aria-label={`Set ${index + 1} RPE`}
                    onChange={(event) => update(item.id, index, { rpe: event.target.value })}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    aria-label={`Remove set ${index + 1}`}
                    onClick={() =>
                      setRows((current) => ({
                        ...current,
                        [item.id]: (current[item.id] ?? []).filter((_, i) => i !== index),
                      }))
                    }
                    className="h-11 w-11 shrink-0 rounded-lg border border-border text-lg text-muted-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setRows((current) => {
                  const existing = current[item.id] ?? [];
                  const last = existing[existing.length - 1];
                  const newRow: SetRow = {
                    done: false,
                    weight:
                      last?.weight ??
                      (item.target_weight == null ? "" : String(item.target_weight)),
                    reps: last?.reps ?? String(item.rep_max),
                    rpe: "",
                    weightEdited: false,
                    repsEdited: false,
                  };
                  return { ...current, [item.id]: [...existing, newRow] };
                })
              }
              className="mt-3 h-10 w-full rounded-xl border border-border text-sm font-semibold text-foreground"
            >
              + Add set
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setReviewing(true)}
        disabled={checked.length === 0}
        className="mt-6 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
      >
        Finish workout ({checked.length} {checked.length === 1 ? "set" : "sets"})
      </button>
    </AppScreen>
  );
}
