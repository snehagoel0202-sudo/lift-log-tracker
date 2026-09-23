import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "@/components/AppScreen";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ScreenState";
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
  const { data, isLoading, error, refetch, isFetching } = useQuery(exercisesQueryOptions);

  const results = useMemo(
    () => (data ?? []).filter((exercise) => matchesSearch(exercise, query)),
    [data, query],
  );

  return (
    <AppScreen title="Library" subtitle="Every exercise LiftLog can plan and track.">
      <Link
        to="/plan"
        className="-ml-2 mb-3 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
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
        <LoadingBlock lines={5} label="Loading exercises" />
      ) : error ? (
        <ErrorState
          message="We couldn't load the exercise library."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={query.trim() ? `No exercises match “${query.trim()}”` : "No exercises yet"}
          hint={query.trim() ? "Try a shorter word, like “press” or “row”." : undefined}
        />
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
