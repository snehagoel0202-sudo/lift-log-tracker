import { createFileRoute, Link } from "@tanstack/react-router";
import { AppScreen, ComingSoon } from "@/components/AppScreen";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan — LiftLog" },
      { name: "description", content: "Plan upcoming workouts in LiftLog." },
      { property: "og:title", content: "Plan — LiftLog" },
      { property: "og:description", content: "Plan upcoming workouts in LiftLog." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  return (
    <AppScreen title="Plan" subtitle="Upcoming planned workouts live here.">
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
      <ComingSoon what="Workout planning" />
    </AppScreen>
  );
}
