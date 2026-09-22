import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LiftLog — Track every rep" },
      {
        name: "description",
        content:
          "LiftLog is a fast, focused workout tracker. Log exercises, sets, reps and weights, and beat last week.",
      },
      { property: "og:title", content: "LiftLog — Track every rep" },
      {
        property: "og:description",
        content: "A fast, focused workout tracker. Log exercises, sets, reps and weights.",
      },
et  ],
  }),
  component: Index,
});

type SetEntry = {
  id: number;
  exercise: string;
  weight: number;
  reps: number;
};

const QUICK_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-up",
];

function Index() {
  const [entries, setEntries] = useState<SetEntry[]>([]);
  const [exercise, setExercise] = useState(QUICK_EXERCISES[0]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [nextId, setNextId] = useState(1);

  const totalVolume = useMemo(
    () => entries.reduce((sum, e) => sum + e.weight * e.reps, 0),
    [entries]
  );

  const canSubmit = exercise.trim() !== "" && Number(weight) > 0 && Number(reps) > 0;

  function addSet(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setEntries((prev) => [
      ...prev,
      { id: nextId, exercise: exercise.trim(), weight: Number(weight), reps: Number(reps) },
    ]);
    setNextId((id) => id + 1);
    setWeight("");
    setReps("");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
              L
            </span>
            <span className="display-title text-2xl text-foreground">LIFTLOG</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="display-title text-5xl text-foreground sm:text-7xl">
            LOG EVERY LIFT.
            <br />
            <span className="text-primary">BEAT LAST WEEK.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Your training log, stripped to what matters: exercises, sets, reps and weight.
          </p>
        </section>

        {/* Stats */}
        <section className="mb-10 grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="SETS TODAY" value={String(entries.length)} />
          <StatCard label="VOLUME (KG)" value={totalVolume.toLocaleString()} />
          <StatCard label="EXERCISES" value={String(new Set(entries.map((e) => e.exercise)).size)} />
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Log a set */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="display-title mb-4 text-2xl text-foreground">LOG A SET</h2>
              <form onSubmit={addSet} className="space-y-4">
                <div>
                  <label htmlFor="exercise" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                    Exercise
                  </label>
                  <input
                    id="exercise"
                    list="quick-exercises"
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                    placeholder="e.g. Bench Press"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
                  />
                  <datalist id="quick-exercises">
                    {QUICK_EXERCISES.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_EXERCISES.slice(0, 4).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setExercise(name)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="weight" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Weight (kg)
                    </label>
                    <input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="60"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="reps" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Reps
                    </label>
                    <input
                      id="reps"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      placeholder="8"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add set
                </button>
              </form>
            </div>
          </section>

          {/* Today's log */}
          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="display-title text-2xl text-foreground">TODAY'S LOG</h2>
                {entries.length > 0 && (
                  <button
                    onClick={() => setEntries([])}
                    className="text-sm text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Clear
                  </button>
                )}
              </div>
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                  <p className="font-medium text-foreground">Nothing logged yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your first set and it will show up here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {entries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-semibold text-foreground">{entry.exercise}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.weight} kg × {entry.reps} reps
                        </p>
                      </div>
                      <span className="display-title text-xl text-primary">
                        {(entry.weight * entry.reps).toLocaleString()} kg
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        LiftLog — track every rep.
      </footer>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <p className="display-title text-3xl text-primary sm:text-5xl">{value}</p>
      <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground sm:text-sm">
        {label}
      </p>
    </div>
  );
}
