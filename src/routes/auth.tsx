import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LiftLog" },
      { name: "description", content: "Sign in to LiftLog with a magic link or your Google account." },
      { property: "og:title", content: "Sign in — LiftLog" },
      {
        property: "og:description",
        content: "Sign in to LiftLog with a magic link or your Google account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/today", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (otpError) {
      setError(otpError.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  async function signInWithGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in didn't work. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/today", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/app-icon-192.png"
            alt="LiftLog"
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl"
          />
          <h1 className="display-title mt-4 text-4xl text-foreground">SIGN IN</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your email or continue with Google.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="font-semibold text-foreground">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a sign-in link to {email.trim()}. Open it on this device.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm text-primary underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border border-input bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
            />
            <button
              type="submit"
              disabled={status === "sending" || email.trim() === ""}
              className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="min-h-12 w-full rounded-xl border border-border bg-card px-4 font-semibold text-foreground transition-colors hover:border-primary"
        >
          Continue with Google
        </button>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
