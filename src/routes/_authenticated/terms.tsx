import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/terms")({
  head: () => ({
    meta: [
      { title: "Before you start — LiftLog" },
      { name: "description", content: "Please read and accept before using LiftLog." },
      { property: "og:title", content: "Before you start — LiftLog" },
      { property: "og:description", content: "Please read and accept before using LiftLog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSaving(true);
    setError(null);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return navigate({ to: "/auth" });
    const { error: saveError } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, accepted_terms_at: new Date().toISOString() }, { onConflict: "id" });
    setSaving(false);
    if (saveError) return setError("We couldn't save that. Please try again.");
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-10">
        <h1 className="display-title text-4xl text-foreground">BEFORE YOU START</h1>
        <p className="mt-6 flex-1 text-lg leading-relaxed text-foreground">
          LiftLog gives general fitness guidance, not medical advice. Check with a doctor before
          starting, especially if you're pregnant, recently gave birth, or have an injury or health
          condition. Stop if something hurts.
        </p>
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          onClick={accept}
          disabled={saving}
          className="min-h-14 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "I understand and accept"}
        </button>
      </div>
    </div>
  );
}
