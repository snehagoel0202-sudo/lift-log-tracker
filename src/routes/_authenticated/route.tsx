import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at, accepted_terms_at")
      .eq("id", data.user.id)
      .maybeSingle();

    const needsTerms = !profile?.accepted_terms_at;
    if (needsTerms) {
      if (location.pathname !== "/terms") throw redirect({ to: "/terms" });
      return { user: data.user };
    }
    if (location.pathname === "/terms") throw redirect({ to: "/today" });

    const needsOnboarding = !profile?.onboarded_at;
    if (needsOnboarding && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (!needsOnboarding && location.pathname === "/onboarding") {
      throw redirect({ to: "/today" });
    }

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <Outlet />
      {pathname === "/onboarding" || pathname === "/terms" ? null : <BottomNav />}
    </>
  );
}
