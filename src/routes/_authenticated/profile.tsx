import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppScreen } from "@/components/AppScreen";
import { ChoiceList } from "@/components/ChoiceList";
import { currentWeeksSinceBirth } from "@/lib/plan-rules";
import { localDateString } from "@/lib/checkins";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { track } from "@/lib/analytics";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/admin.functions";
import { LoadingBlock } from "@/components/ScreenState";
import {
  PostpartumFields,
  answersFromProfile,
  postpartumColumns,
  type PostpartumAnswers,
} from "@/components/PostpartumFields";
import {
  DAYS,
  EQUIPMENT,
  EXPERIENCES,
  GOALS,
  SESSION_MINUTES,
  BIRTH_TYPES,
  labelFor,
  postpartumInfoFrom,
  profileQueryOptions,
  type Equipment,
  type Experience,
  type Goal,
  type Unit,
} from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LiftLog" },
      { name: "description", content: "Your LiftLog training profile and preferences." },
      { property: "og:title", content: "Profile — LiftLog" },
      {
        property: "og:description",
        content: "Your LiftLog training profile and preferences.",
      },
    ],
  }),
  component: ProfilePage,
});

type Draft = {
  display_name: string;
  goal: Goal | null;
  experience: Experience | null;
  days_per_week: number | null;
  session_minutes: number | null;
  equipment: Equipment | null;
  weight_unit: Unit;
  pp: PostpartumAnswers;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const checkAdmin = useServerFn(amIAdmin);
  const { data: adminCheck } = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery(profileQueryOptions);
  const profile = data?.profile ?? null;

  useEffect(() => {
    if (!editing || draft || !profile) return;
    setDraft({
      display_name: profile.display_name ?? "",
      goal: profile.goal,
      experience: profile.experience,
      days_per_week: profile.days_per_week,
      session_minutes: profile.session_minutes,
      equipment: profile.equipment,
      weight_unit: profile.weight_unit,
      pp: answersFromProfile(profile),
    });
  }, [editing, draft, profile]);

  async function save() {
    if (!draft || !data) return;
    setError(null);
    setSaving(true);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        display_name: draft.display_name.trim() || null,
        goal: draft.goal,
        experience: draft.experience,
        days_per_week: draft.days_per_week,
        session_minutes: draft.session_minutes,
        equipment: draft.equipment,
        weight_unit: draft.weight_unit,
        ...postpartumColumns(draft.pp, profile),
      })
      .eq("id", data.userId);
    setSaving(false);
    if (saveError) {
      setError("We couldn't save your changes. Please try again.");
      return;
    }
    if (draft.pp.postpartum && !profile?.postpartum) void track("postpartum_mode_on");
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setDraft(null);
    setEditing(false);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppScreen title="Profile">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">SIGNED IN AS</p>
          <p className="mt-1 break-all font-semibold text-foreground">
            {isLoading ? "…" : data?.email}
          </p>
        </section>

        {isLoading ? (
          <LoadingBlock lines={3} label="Loading your profile" />
        ) : editing && draft ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground">
                NAME
              </label>
              <input
                type="text"
                value={draft.display_name}
                onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                placeholder="Your name"
                className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-foreground outline-none focus:border-primary"
              />
            </section>

            <EditBlock title="GOAL">
              <ChoiceList
                options={GOALS}
                value={draft.goal}
                onSelect={(goal) => setDraft({ ...draft, goal })}
              />
            </EditBlock>

            <EditBlock title="EXPERIENCE">
              <ChoiceList
                options={EXPERIENCES}
                value={draft.experience}
                onSelect={(experience) => setDraft({ ...draft, experience })}
              />
            </EditBlock>

            <EditBlock title="DAYS PER WEEK">
              <ChoiceList
                options={DAYS.map((d) => ({ value: d, label: `${d} days a week` }))}
                value={draft.days_per_week}
                onSelect={(days_per_week) => setDraft({ ...draft, days_per_week })}
              />
            </EditBlock>

            <EditBlock title="SESSION LENGTH">
              <ChoiceList
                options={SESSION_MINUTES.map((m) => ({ value: m, label: `${m} minutes` }))}
                value={draft.session_minutes}
                onSelect={(session_minutes) => setDraft({ ...draft, session_minutes })}
              />
            </EditBlock>

            <EditBlock title="EQUIPMENT">
              <ChoiceList
                options={EQUIPMENT}
                value={draft.equipment}
                onSelect={(equipment) => setDraft({ ...draft, equipment })}
              />
            </EditBlock>

            <EditBlock title="WEIGHT UNIT">
              <ChoiceList
                options={[
                  { value: "kg" as Unit, label: "Kilograms (kg)" },
                  { value: "lb" as Unit, label: "Pounds (lb)" },
                ]}
                value={draft.weight_unit}
                onSelect={(weight_unit) => setDraft({ ...draft, weight_unit })}
              />
            </EditBlock>

            <EditBlock title="POSTPARTUM">
              <PostpartumFields
                value={draft.pp}
                onChange={(pp) => setDraft({ ...draft, pp })}
              />
            </EditBlock>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setEditing(false);
                  setError(null);
                }}
                className="min-h-12 rounded-xl border border-border px-5 font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                TRAINING PROFILE
              </p>
              <div className="mt-2 divide-y divide-border">
                <Row label="Name" value={profile?.display_name || "Not set"} />
                <Row label="Goal" value={labelFor(GOALS, profile?.goal)} />
                <Row label="Experience" value={labelFor(EXPERIENCES, profile?.experience)} />
                <Row
                  label="Days per week"
                  value={profile?.days_per_week ? `${profile.days_per_week} days` : "Not set"}
                />
                <Row
                  label="Session length"
                  value={
                    profile?.session_minutes ? `${profile.session_minutes} minutes` : "Not set"
                  }
                />
                <Row label="Equipment" value={labelFor(EQUIPMENT, profile?.equipment)} />
                <Row label="Weight unit" value={(profile?.weight_unit ?? "kg").toUpperCase()} />
                <Row label="Postpartum" value={profile?.postpartum ? "Yes" : "No"} />
                {profile?.postpartum ? (
                  <>
                    <Row
                      label="Weeks since birth"
                      value={
                        profile.postpartum_weeks_since_birth == null
                          ? "Not set"
                          : `${currentWeeksSinceBirth(postpartumInfoFrom(profile)!, localDateString())} weeks`
                      }
                    />
                    <Row label="Birth type" value={labelFor(BIRTH_TYPES, profile.postpartum_birth_type)} />
                    <Row
                      label="Cleared for exercise"
                      value={profile.postpartum_cleared ? "Yes" : "Not yet"}
                    />
                  </>
                ) : null}
              </div>
            </section>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
            >
              Edit profile
            </button>
          </>
        )}

        <button
          type="button"
          onClick={signOut}
          className="min-h-12 w-full rounded-xl border border-border px-4 font-semibold text-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          Sign out
        </button>

        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="min-h-12 w-full rounded-xl border border-border px-4 font-semibold text-foreground"
        >
          Send feedback
        </button>
        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />

        <DeleteAccountDialog />

        <p className="pt-1 text-center text-xs text-muted-foreground">
          LiftLog gives general fitness guidance, not medical advice.
        </p>
        <Link to="/privacy" className="block text-center text-sm text-muted-foreground underline">
          Privacy
        </Link>
      </div>
    </AppScreen>
  );
}

function EditBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}
