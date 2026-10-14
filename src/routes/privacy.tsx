import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — LiftLog" },
      { name: "description", content: "What LiftLog stores, who can see it, and how to delete it." },
      { property: "og:title", content: "Privacy — LiftLog" },
      { property: "og:description", content: "What LiftLog stores, who can see it, and how to delete it." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md space-y-5 px-4 pb-12 pt-10 text-foreground">
        <h1 className="display-title text-4xl">PRIVACY</h1>
        <section>
          <h2 className="font-semibold">What we store</h2>
          <p className="mt-1 text-muted-foreground">
            Your email, your profile answers (name, goal, experience, schedule, equipment, unit and
            optional postpartum details), daily check-ins, workout plans, and the workouts and sets
            you log. Text you send for workout parsing is processed by an AI service to fill in the
            review card.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Private to you</h2>
          <p className="mt-1 text-muted-foreground">
            Only you can read or change your data. Other LiftLog users can never see it. We don't
            sell or share it.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Deleting it</h2>
          <p className="mt-1 text-muted-foreground">
            Go to Profile and tap "Delete my account and data". Deletion is permanent and happens
            immediately in the app: your account and everything you've stored, including anything
            you had hidden, is removed. Copies in database backups are cleared as the backup
            provider rotates its backups on its normal schedule.
          </p>
        </section>
        <Link to="/" className="inline-block text-sm font-semibold text-primary">
          ← Back
        </Link>
      </div>
    </div>
  );
}
