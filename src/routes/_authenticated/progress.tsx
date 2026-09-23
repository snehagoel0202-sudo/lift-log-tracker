import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppScreen } from "@/components/AppScreen";
import { exercisesQueryOptions } from "@/lib/exercises";
import {
  bestSetsByUnit,
  formatDayLabel,
  hideSet,
  historyQueryOptions,
  summariseWeek,
  updateSet,
  type LoggedSession,
  type LoggedSet,
} from "@/lib/history";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — LiftLog" },
      { name: "description", content: "Your workout history, weekly totals and lift-by-lift progress." },
      { property: "og:title", content: "Progress — LiftLog" },
      {
        property: "og:description",
        content: "Your workout history, weekly totals and lift-by-lift progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-center text-base text-foreground";

function ProgressPage() {
  const historyQuery = useQuery(historyQueryOptions);
  const exercisesQuery = useQuery(exercisesQueryOptions);
  const sessions = historyQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];
  const nameOf = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise.name])),
    [exercises],
  );

  const week = useMemo(() => summariseWeek(sessions), [sessions]);

  const loggedExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const session of sessions) for (const set of session.sets) ids.add(set.exercise_id);
    return [...ids].sort((a, b) => (nameOf.get(a) ?? "").localeCompare(nameOf.get(b) ?? ""));
  }, [sessions, nameOf]);

  const [selected, setSelected] = useState<string>("");
  const exerciseId = selected || loggedExerciseIds[0] || "";
  const series = useMemo(
    () => (exerciseId ? bestSetsByUnit(sessions, exerciseId) : []),
    [sessions, exerciseId],
  );

  return (
    <AppScreen title="Progress" subtitle="Your week so far, how each lift is trending, and every workout you've logged.">
      <section className="mb-6 rounded-2xl border border-border bg-card p-4">
        <p className="display-title text-xl text-foreground">THIS WEEK</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="display-title text-3xl text-primary">{week.workouts}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </div>
          <div>
            <p className="display-title text-3xl text-primary">{week.sets}</p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </div>
          <div>
            <p className="display-title text-3xl text-primary">
              {week.volume.length === 0
                ? "—"
                : week.volume.map((v) => Math.round(v.total).toLocaleString("en-GB")).join(" / ")}
            </p>
            <p className="text-xs text-muted-foreground">
              Volume{week.volume.length ? ` (${week.volume.map((v) => v.unit).join(" / ")})` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <p className="display-title mb-3 text-xl text-foreground">EXERCISE PROGRESS</p>
        {loggedExerciseIds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Log a workout and your lift trends show up here.
          </p>
        ) : (
          <div className="space-y-4">
            <select
              value={exerciseId}
              onChange={(event) => setSelected(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"
            >
              {loggedExerciseIds.map((id) => (
                <option key={id} value={id}>
                  {nameOf.get(id) ?? "Exercise"}
                </option>
              ))}
            </select>

            {series.map((line) => (
              <div key={line.unit} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">
                  Heaviest set in {line.unit}
                  {series.length > 1 ? " (separate units are never mixed)" : ""}
                </p>
                <div className="mt-3 h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={line.points} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDayLabel}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelFormatter={(value) => formatDayLabel(String(value))}
                        formatter={(value, name) => [`${value} ${line.unit}`, String(name)]}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        name="Heaviest"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot
                      />
                      <Line
                        type="monotone"
                        dataKey="e1rm"
                        name="Est. 1RM"
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {[...line.points]
                    .reverse()
                    .slice(0, 6)
                    .map((point) => (
                      <li key={point.date} className="flex justify-between">
                        <span>{formatDayLabel(point.date)}</span>
                        <span className="text-foreground">
                          {point.weight} {line.unit}
                          {point.reps != null ? ` × ${point.reps}` : ""}
                          {point.e1rm != null ? ` · est. 1RM ${point.e1rm} ${line.unit}` : ""}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="display-title mb-3 text-xl text-foreground">HISTORY</p>
        {historyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your workouts…</p>
        ) : sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No workouts logged yet.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} nameOf={nameOf} />
            ))}
          </div>
        )}
      </section>
    </AppScreen>
  );
}

function SessionCard({
  session,
  nameOf,
}: {
  session: LoggedSession;
  nameOf: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-16 w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="block font-semibold text-foreground">{formatDayLabel(session.date)}</span>
          <span className="block text-sm text-muted-foreground">
            {session.notes ?? (session.source === "chat" ? "Logged workout" : "Workout")} ·{" "}
            {session.sets.length} {session.sets.length === 1 ? "set" : "sets"}
          </span>
        </span>
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {session.sets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sets left in this workout.</p>
          ) : (
            session.sets.map((set) => (
              <SetRow key={set.id} set={set} name={nameOf.get(set.exercise_id) ?? "Exercise"} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function SetRow({ set, name }: { set: LoggedSet; name: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [weight, setWeight] = useState(set.weight == null ? "" : String(set.weight));
  const [unit, setUnit] = useState(set.unit);
  const [reps, setReps] = useState(set.reps == null ? "" : String(set.reps));
  const [rpe, setRpe] = useState(set.rpe == null ? "" : String(set.rpe));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["history"] });

  const save = useMutation({
    mutationFn: () =>
      updateSet(set.id, {
        weight: weight.trim() === "" ? null : Number(weight),
        unit,
        reps: reps.trim() === "" ? null : Math.trunc(Number(reps)),
        rpe: rpe.trim() === "" ? null : Number(rpe),
      }),
    onSuccess: async () => {
      setEditing(false);
      await refresh();
    },
  });

  const remove = useMutation({
    mutationFn: () => hideSet(set.id),
    onSuccess: async () => {
      setConfirming(false);
      await refresh();
    },
  });

  if (editing) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-3">
        <p className="text-sm font-semibold text-foreground">
          {name} · set {set.set_number}
        </p>
        <div className="grid grid-cols-4 gap-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">Weight</span>
            <input
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Unit</span>
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value as "kg" | "lb")}
              className={`mt-1 ${inputClass}`}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Reps</span>
            <input
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">RPE</span>
            <input
              inputMode="decimal"
              value={rpe}
              onChange={(event) => setRpe(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="h-11 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save set"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-11 flex-1 rounded-xl border border-border font-semibold text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            Set {set.set_number} ·{" "}
            {set.weight == null ? "— " : `${set.weight} ${set.unit} `}×{" "}
            {set.reps == null ? "—" : set.reps}
            {set.rpe == null ? "" : ` · RPE ${set.rpe}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-11 rounded-xl border border-border px-3 text-sm font-semibold text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-11 rounded-xl border border-border px-3 text-sm font-semibold text-destructive"
          >
            Delete
          </button>
        </div>
      </div>
      {confirming ? (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm text-foreground">Remove this set from your history?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
              className="h-11 flex-1 rounded-xl bg-destructive font-semibold text-destructive-foreground disabled:opacity-50"
            >
              {remove.isPending ? "Removing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-11 flex-1 rounded-xl border border-border font-semibold text-foreground"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
