import type { ReactNode } from "react";

export function AppScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-5">
          <img src="/app-icon-192.png" alt="" className="h-8 w-8 rounded-lg" width={32} height={32} />
          <h1 className="display-title text-3xl text-foreground">{title.toUpperCase()}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">
        {subtitle ? <p className="mb-5 text-sm text-muted-foreground">{subtitle}</p> : null}
        {children}
      </main>
    </div>
  );
}

export function ComingSoon({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="font-semibold text-foreground">{what}</p>
      <p className="mt-1 text-sm text-muted-foreground">Coming next — nothing to see here yet.</p>
    </div>
  );
}
