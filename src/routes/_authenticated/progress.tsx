import { createFileRoute } from "@tanstack/react-router";
import { AppScreen, ComingSoon } from "@/components/AppScreen";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — LiftLog" },
      { name: "description", content: "See how your lifts are progressing over time." },
      { property: "og:title", content: "Progress — LiftLog" },
      { property: "og:description", content: "See how your lifts are progressing over time." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <AppScreen title="Progress" subtitle="Trends and personal records will appear here.">
      <ComingSoon what="Progress charts" />
    </AppScreen>
  );
}
