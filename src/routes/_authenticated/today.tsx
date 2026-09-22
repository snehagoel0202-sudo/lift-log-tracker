import { createFileRoute } from "@tanstack/react-router";
import { AppScreen, ComingSoon } from "@/components/AppScreen";
import { CheckinCard } from "@/components/CheckinCard";

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

function Today() {
  return (
    <AppScreen title="Today" subtitle="Your session for today will show up here.">
      <ComingSoon what="Today's workout" />
    </AppScreen>
  );
}
