import { createFileRoute } from "@tanstack/react-router";
import { AppScreen, ComingSoon } from "@/components/AppScreen";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Log — LiftLog" },
      { name: "description", content: "Log your sets, reps and weights in LiftLog." },
      { property: "og:title", content: "Log — LiftLog" },
      { property: "og:description", content: "Log your sets, reps and weights in LiftLog." },
    ],
  }),
  component: LogPage,
});

function LogPage() {
  return (
    <AppScreen title="Log" subtitle="Record each set as you finish it.">
      <ComingSoon what="Set logging" />
    </AppScreen>
  );
}
