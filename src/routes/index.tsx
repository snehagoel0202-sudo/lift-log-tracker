import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/today", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <img
        src="/app-icon-192.png"
        alt="LiftLog"
        width={80}
        height={80}
        className="h-20 w-20 rounded-2xl"
      />
      <h1 className="display-title mt-6 text-5xl text-foreground sm:text-6xl">
        LOG EVERY LIFT.
        <br />
        <span className="text-primary">BEAT LAST WEEK.</span>
      </h1>
      <p className="mt-4 max-w-sm text-muted-foreground">
        Your training log, stripped to what matters: exercises, sets, reps and weight.
      </p>
      <Link
        to="/auth"
        className="mt-8 inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-all hover:brightness-110"
      >
        Get started
      </Link>
    </div>
  );
}
