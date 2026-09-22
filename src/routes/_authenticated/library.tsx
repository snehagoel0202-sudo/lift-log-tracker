import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "@/components/AppScreen";
import { EQUIPMENT_LABELS, exercisesQueryOptions, matchesSearch } from "@/lib/exercises";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Exercise library — LiftLog" },
      {
        name: "description",
        content: "Search the LiftLog exercise library by name, muscle group or equipment.",
      },
      { property: "og:title", content: "Exercise library — LiftLog" },
      {
        property: "og:description",
        content: "Search the LiftLog exercise library by name, muscle group or equipment.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQuery(exercisesQueryOptions);

  const results = useMemo(
    () => (data ?? []).filter((exercise) => matchesSearch(exercise, query)),
    [data, query],
  );

  return (
    <AppScreen title="Library" subtitle="Every exercise LiftLog can plan and track.">
      <Link
        to="/plan"
        className="mb-4 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Back to Plan
      </Link>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search exercises…"
        aria-label="Search exercises"
        className="mb-5 min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading exercises…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn’t load the exercise library.</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exercises match “{query}”.</p>
      ) : (
        <ul className="space-y-3">
          {results.map((exercise) => (
            <li
              key={exercise.id}
              className="flex min-h-16 flex-col justify-center rounded-2xl border border-border bg-card px-5 py-3"
            >
              <span className="font-semibold text-foreground">{exercise.name}</span>
              <span className="text-sm text-muted-foreground">
                {exercise.muscle_group} · {EQUIPMENT_LABELS[exercise.equipment]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppScreen>
  );
}
