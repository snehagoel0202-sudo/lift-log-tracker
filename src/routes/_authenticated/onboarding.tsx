import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChoiceList } from "@/components/ChoiceList";
import {
  EMPTY_POSTPARTUM,
  PostpartumFields,
  postpartumColumns,
  type PostpartumAnswers,
} from "@/components/PostpartumFields";
import {
  DAYS,
  EQUIPMENT,
  EXPERIENCES,
  GOALS,
  SESSION_MINUTES,
  type Equipment,
  type Experience,
  type Goal,
  type Unit,
} from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — LiftLog" },
      { name: "description", content: "Tell LiftLog how you train so it can plan your sessions." },
      { property: "og:title", content: "Set up your profile — LiftLog" },
      {
        property: "og:description",
        content: "Tell LiftLog how you train so it can plan your sessions.",
      },
    ],
  }),
  component: Onboarding,
});

type Answers = {
  display_name: string;
  goal: Goal | null;
  experience: Experience | null;
  days_per_week: number | null;
  session_minutes: number | null;
  equipment: Equipment | null;
  weight_unit: Unit;
  pp: PostpartumAnswers;
};

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({
    display_name: "",
    goal: null,
    experience: null,
    days_per_week: null,
    session_minutes: null,
    equipment: null,
    weight_unit: "kg",
    pp: EMPTY_POSTPARTUM,
  });

  const steps = [
    {
      title: "What should we call you?",
      subtitle: "Just a first name is fine.",
      canContinue: answers.display_name.trim().length > 0,
      body: (
        <input
          type="text"
          value={answers.display_name}
          onChange={(e) => setAnswers((a) => ({ ...a, display_name: e.target.value }))}
          placeholder="Your name"
          autoComplete="given-name"
          className="min-h-14 w-full rounded-2xl border border-border bg-card px-5 text-lg text-foreground outline-none focus:border-primary"
        />
      ),
    },
    {
      title: "What's your main goal?",
      canContinue: answers.goal !== null,
      body: (
        <ChoiceList
          options={GOALS}
          value={answers.goal}
          onSelect={(goal) => {
            setAnswers((a) => ({ ...a, goal }));
            next();
          }}
        />
      ),
    },
    {
      title: "How much training have you done?",
      canContinue: answers.experience !== null,
      body: (
        <ChoiceList
          options={EXPERIENCES}
          value={answers.experience}
          onSelect={(experience) => {
            setAnswers((a) => ({ ...a, experience }));
            next();
          }}
        />
      ),
    },
    {
      title: "How many days a week?",
      canContinue: answers.days_per_week !== null,
      body: (
        <ChoiceList
          options={DAYS.map((d) => ({ value: d, label: `${d} days a week` }))}
          value={answers.days_per_week}
          onSelect={(days_per_week) => {
            setAnswers((a) => ({ ...a, days_per_week }));
            next();
          }}
        />
      ),
    },
    {
      title: "How long is a session?",
      canContinue: answers.session_minutes !== null,
      body: (
        <ChoiceList
          options={SESSION_MINUTES.map((m) => ({ value: m, label: `${m} minutes` }))}
          value={answers.session_minutes}
          onSelect={(session_minutes) => {
            setAnswers((a) => ({ ...a, session_minutes }));
            next();
          }}
        />
      ),
    },
    {
      title: "What can you train with?",
      canContinue: answers.equipment !== null,
      body: (
        <ChoiceList
          options={EQUIPMENT}
          value={answers.equipment}
          onSelect={(equipment) => {
            setAnswers((a) => ({ ...a, equipment }));
            next();
          }}
        />
      ),
    },
    {
      title: "Are you postpartum?",
      subtitle: "Optional. This keeps plans gentle and low-impact. Skip if it doesn't apply.",
      canContinue: true,
      body: (
        <PostpartumFields
          value={answers.pp}
          onChange={(pp) => setAnswers((a) => ({ ...a, pp }))}
        />
      ),
    },
    {
      title: "Which unit do you lift in?",
      subtitle: "Weights are always saved in the unit you enter.",
      canContinue: true,
      body: (
        <ChoiceList
          options={[
            { value: "kg" as Unit, label: "Kilograms (kg)" },
            { value: "lb" as Unit, label: "Pounds (lb)" },
          ]}
          value={answers.weight_unit}
          onSelect={(weight_unit) => setAnswers((a) => ({ ...a, weight_unit }))}
        />
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const current = steps[step]!;

  function next() {
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      navigate({ to: "/auth" });
      return;
    }
    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: answers.display_name.trim(),
        goal: answers.goal,
        experience: answers.experience,
        days_per_week: answers.days_per_week,
        session_minutes: answers.session_minutes,
        equipment: answers.equipment,
        weight_unit: answers.weight_unit,
        ...postpartumColumns(answers.pp, null),
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (saveError) {
      setError("We couldn't save that. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/today", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6">
        <div className="flex gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        <p className="mt-6 text-xs font-medium tracking-wide text-muted-foreground">
          STEP {step + 1} OF {steps.length}
        </p>
        <h1 className="display-title mt-1 text-4xl text-foreground">
          {current.title.toUpperCase()}
        </h1>
        {current.subtitle ? (
          <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>
        ) : null}

        <div className="mt-6 flex-1">{current.body}</div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-8 flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="min-h-14 rounded-xl border border-border px-6 font-semibold text-foreground"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={!current.canContinue || saving}
            onClick={() => (isLast ? save() : next())}
            className="min-h-14 flex-1 rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isLast ? (saving ? "Saving…" : "Finish") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
