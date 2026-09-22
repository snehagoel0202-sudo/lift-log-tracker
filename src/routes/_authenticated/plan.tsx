import { createFileRoute } from "@tanstack/react-router";
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
      <ComingSoon what="Workout planning" />
    </AppScreen>
  );
}
