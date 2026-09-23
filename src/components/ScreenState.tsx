import type { ReactNode } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/40 ${className}`} />;
}

export function LoadingBlock({
  lines = 3,
  label,
}: {
  lines?: number | undefined;
  label?: string | undefined;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label ?? "Loading"} className="space-y-3">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | undefined;
  children?: ReactNode | undefined;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function ErrorState({
  message = "Something didn't load just now.",
  onRetry,
  retrying,
}: {
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
}) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-center">
      <p className="text-sm text-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 min-h-12 w-full rounded-xl border border-border bg-card px-4 font-semibold text-foreground disabled:opacity-60"
        >
          {retrying ? "Trying again…" : "Try again"}
        </button>
      ) : null}
    </div>
  );
}
