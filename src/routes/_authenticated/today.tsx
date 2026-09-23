import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppScreen } from "@/components/AppScreen";
import { CheckinCard } from "@/components/CheckinCard";
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

type SetRow = { done: boolean; weight: string; reps: string; rpe: string };

function rowsForItem(item: PlanItem): SetRow[] {
  return Array.from({ length: item.sets }, () => ({
    done: false,
    weight: item.target_weight == null ? "" : String(item.target_weight),
    reps: String(item.rep_max),
    rpe: "",
  }));
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-center text-base text-foreground";

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
    setSavedCount(null);
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
    setRows((current) => {
      const list = [...(current[itemId] ?? [])];
      list[index] = { ...list[index]!, ...patch };
      return { ...current, [itemId]: list };
    });
  }

  if (planQuery.isLoading) {
    return (
      <AppScreen title="Today">
        <CheckinCard />
        <p className="text-sm text-muted-foreground">Loading your workout…</p>
      </AppScreen>
    );
  }

  if (!plan) {
    return (
      <AppScreen title="Today" subtitle="No approved plan yet.">
        <CheckinCard />
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-semibold text-foreground">You don't have a plan yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a weekly plan first, then your sessions show up here.
          </p>
          <Link
            to="/plan"
            className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground"
          >
            Go to Plan
          </Link>
        </div>
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

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-9" />
                <span className="flex-1 text-center">Weight ({item.unit})</span>
                <span className="flex-1 text-center">Reps</span>
                <span className="flex-1 text-center">RPE</span>
                <span className="w-8" />
              </div>
              {(rows[item.id] ?? []).map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Set ${index + 1} done`}
                    checked={row.done}
                    onChange={(event) => update(item.id, index, { done: event.target.checked })}
                    className="h-9 w-9 shrink-0 rounded-lg accent-primary"
                  />
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
                    className="h-9 w-8 shrink-0 rounded-lg border border-border text-muted-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setRows((current) => ({
                  ...current,
                  [item.id]: [
                    ...(current[item.id] ?? []),
                    {
                      done: false,
                      weight: item.target_weight == null ? "" : String(item.target_weight),
                      reps: String(item.rep_max),
                      rpe: "",
                    },
                  ],
                }))
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
