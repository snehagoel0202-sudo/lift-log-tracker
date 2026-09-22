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
      .select("onboarded_at")
      .eq("id", data.user.id)
      .maybeSingle();

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
      {pathname === "/onboarding" ? null : <BottomNav />}
    </>
  );
}
