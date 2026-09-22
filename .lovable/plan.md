# LiftLog — App Foundation

Set up sign-in, the 5-tab app shell, and phone installability. No training features yet.

## 1. Sign-in

- Turn on Lovable Cloud (built-in database, accounts, server code).
- Signed-out visitors land on a simple welcome screen: LiftLog mark, one line of copy, and a "Get started" button.
- Sign-in screen offers two options: email magic link (enter email, receive a link) and "Continue with Google".
- After sign-in the person is taken straight to the Today tab.
- Each person gets their own private profile record holding display name and preferred weight unit (kg or lb), defaulting to kg. Only they can read or change it.

## 2. App shell with 5 tabs

- Bottom navigation with Today, Log, Plan, Progress, Profile — large touch targets, clear active state.
- Each tab is its own page with a title and a short "coming soon" note, so nothing looks broken.
- Profile shows the signed-in email, the weight-unit choice, and a sign-out button.
- Everything behind sign-in; anyone not signed in is sent back to the welcome screen.

## 3. Installable on phones

- App manifest with name, short name, dark theme colour, standalone display.
- Generated LiftLog app icon (bold lime mark on near-black), used for the home-screen icon, the iPhone touch icon, and the browser favicon.
- Works with Android's install prompt and iPhone's "Add to Home Screen". No offline mode for now — that can come later.

## 4. Layout

- Mobile-first: content column with comfortable spacing, safe-area padding above the bottom bar for iPhone.
- On desktop the same layout centres in a narrow column so it stays readable.
- Existing dark athletic look (Bebas Neue headings, lime accent) carried through.

## Technical notes

- Enable Lovable Cloud, then `configure_auth` for magic-link email plus `configure_social_auth` for Google via the Lovable broker (`lovable.auth.signInWithOAuth`).
- Routes: public `/` (welcome) and `/auth`; protected subtree `src/routes/_authenticated/` with the integration-managed `ssr: false` gate and children `today`, `log`, `plan`, `progress`, `profile`. Sign-in redirects to `/today`.
- Migration: `profiles` table (`id` → `auth.users`, `display_name`, `weight_unit` enum kg/lb), explicit GRANTs, RLS scoped to `auth.uid()`, trigger to create the row on signup.
- Manifest-only PWA per the PWA skill: `public/manifest.webmanifest`, icons in `public/`, head links in `__root.tsx`. No service worker.
- Shared `BottomNav` component using `<Link activeProps>`; sign-out follows cancel/clear/signOut/replace-navigate order.
- Replace the locale date string in the header with a hydration-safe rendering.
