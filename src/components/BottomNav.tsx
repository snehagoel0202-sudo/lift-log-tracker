import { Link } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, LineChart, Plus, User } from "lucide-react";

const TABS = [
  { to: "/today", label: "Today", Icon: CalendarDays },
  { to: "/log", label: "Log", Icon: Plus },
  { to: "/plan", label: "Plan", Icon: ClipboardList },
  { to: "/progress", label: "Progress", Icon: LineChart },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
