import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppScreen } from "@/components/AppScreen";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LiftLog" },
      { name: "description", content: "Your LiftLog account and preferences." },
      { property: "og:title", content: "Profile — LiftLog" },
      { property: "og:description", content: "Your LiftLog account and preferences." },
    ],
  }),
  component: ProfilePage,
});

type WeightUnit = "kg" | "lb";

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, weight_unit")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      return {
        email: user?.email ?? "",
        displayName: profile?.display_name ?? "",
        weightUnit: (profile?.weight_unit ?? "kg") as WeightUnit,
      };
    },
  });

  async function setUnit(unit: WeightUnit) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .upsert({ id: userData.user.id, weight_unit: unit }, { onConflict: "id" });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setSaving(false);
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
          {data?.displayName ? (
            <p className="mt-1 text-sm text-muted-foreground">{data.displayName}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">WEIGHT UNIT</p>
          <div className="mt-3 flex gap-2">
            {(["kg", "lb"] as const).map((unit) => {
              const active = data?.weightUnit === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  disabled={saving}
                  onClick={() => setUnit(unit)}
                  className={`min-h-12 flex-1 rounded-xl border px-4 font-semibold uppercase transition-colors disabled:opacity-50 ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {unit}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Weights are always stored in the unit you entered them in.
          </p>
        </section>

        <button
          type="button"
          onClick={signOut}
          className="min-h-12 w-full rounded-xl border border-border px-4 font-semibold text-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          Sign out
        </button>
      </div>
    </AppScreen>
  );
}
