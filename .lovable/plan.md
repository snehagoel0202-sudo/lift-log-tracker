# Final MVP pass

## 1. Security — already verified (no changes needed)

I checked the database directly. Every table holding your data has row-level protection switched on, and every rule ties the row to the signed-in person. Nobody can read anyone else's rows.

| Table | Read | Add | Change | Hide |
|---|---|---|---|---|
| profiles | own row only | own row only | own row only | — |
| workout_sessions | own rows | own rows | own rows | own rows |
| workout_sets | own rows | own rows | own rows | own rows |
| checkins | own rows | own rows | own rows | own rows |
| plans | own rows | own rows | own rows | own rows |
| plan_items | own rows | own rows | own rows | own rows |
| exercises | readable by everyone (shared library, nothing personal) | — | — | — |

Every "own rows" rule above is the same check: the row's owner must equal the signed-in account. The shared exercise library is intentionally public-readable; it contains no personal data.

As part of this pass I'll also run the security scanner and report anything it flags.

## 2. Empty, loading and error states on every screen

One consistent look for all three, reused everywhere:
- Loading: a quiet skeleton block instead of a blank screen.
- Empty: a short line plus, where it helps, a button to the obvious next step.
- Error: plain wording ("We couldn't load your workouts. Tap to try again.") with a retry button — never a raw technical message.

Per screen:
- Today: loading skeleton for the session; no plan yet → button to Plan; no check-in → the existing card; save failure → retry.
- Log: review failures already read well; add a loading state on Review and a retry on save failure.
- Plan: loading skeleton; "No plan yet" with Recommend; failure to suggest → friendly retry.
- Progress: loading skeletons for the week card, chart and history; "No workouts yet" pointing to Today; "No sets for this lift yet" for the chart.
- Library: loading skeleton, and "No exercises match that search".
- Profile: loading placeholder while the profile loads, save-failure message (already present).

## 3. Phone-width polish

Review every screen at 390px wide and fix what's cramped: minimum 44px tall tap targets everywhere (including small "Edit", "Collapse" and day-picker controls), no sideways scrolling, number inputs wide enough for three digits, the Today set rows and the Progress history rows given breathing room, chart labels readable, and comfortable spacing above the bottom bar on iPhone.

## 4. Profile disclaimer

Add one quiet line at the bottom of the Profile tab: "LiftLog gives general fitness guidance, not medical advice."

## 5. Publish

Publish the app and give you the live link.

## Technical notes

- Reusable `ScreenState` component (skeleton / empty / error variants) in `src/components`; wire into `today.tsx`, `log.tsx`, `plan.tsx`, `progress.tsx`, `library.tsx`, `profile.tsx` using existing `useQuery` `isPending` / `isError` / `refetch`.
- No schema changes, no migrations, no data writes. The soft-delete-only rule stays intact.
- Phone check via Playwright at 390x1800 across all routes with screenshots; then `security--run_security_scan` and `preview_ui--publish`.
