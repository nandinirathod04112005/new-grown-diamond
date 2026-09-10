# What changed — 9 September 2026

Branch: `claude/admin-control-centre` (pushed to origin). Newest first.

**संक्षेप में (Hindi):** आज तीन काम हुए — (1) हर page के banner पर असली photo + animation
(commit `c547f3b`); (2) Administrator register अब सच में admin बनाता है और admin login सीधे
`/admin` पर जाता है (`d722887`, `0724dbf`); (3) customer sign-up / sign-in दोनों Supabase
settings (Confirm email ON/OFF) में सही चलते हैं, कोई magic link नहीं भेजा जाता, और
development वाला SMTP notice हटा दिया गया (`5c2718d`, `1378b73`, `9115f0a`)। आपके करने के
काम नीचे "Owner to-do" में हैं।

---

## 1. Banners — photograph + animation on every page (`c547f3b`)

Every page opening now stands in front of a full-bleed photograph with motion.
One shared layer does it everywhere: `src/components/layout/HeroBackdrop.jsx`
(+ `.module.css`), driven by `src/hooks/useHeroProgress.js`.

| Page | Photograph (all real assets already in the repo) |
| --- | --- |
| /about | `process/surat-to-world.webp` |
| /education | `process/seed-to-stone.webp` |
| /cvd-vs-natural | `process/lattice-cut.webp` |
| /price-and-size, /shapes | `process/cut-stone.webp` |
| /why-lab-grown | `process/grading-bench.webp` |
| /contact | `company/custom-jewellery-optimized.jpg` (stone in tweezers) |
| /faq | `process/cvd-technical-schematic.webp` (the old 526×292 `hpht-rough.jpg` is too small to fill a banner) |
| /jewellery | `process/ring-assembly.webp` |
| /blogs | `process/grading-bench.webp` |
| /diamonds (inventory) | `process/cut-stone.webp` |
| 404 (any unknown path) | `diamonds/ngd-brilliant-macro.webp` |
| / (home) | untouched on purpose — the Atelier sequence is already an image-driven animated opening |

**Animation.** The photo opens from soft/near to sharp (1.9 s blur → scale → fade),
drifts slowly for 44 s, leans away from the pointer, and falls behind the page as
you scroll (parallax + fade). A faint band of light crosses every 14 s. An
accent-tinted wash and a scrim built from `--ink` keep the copy legible in both
the dark and the light theme. All of it is CSS; the hooks only write numbers
(`--mx/--my` from the existing pointer parallax, `--hp` = scroll progress). No
ScrollTrigger was added (house rule in `src/lib/motion/gsap.js`). Under
`prefers-reduced-motion` the banner is a still photograph.

**To change a page's photo:** editorial pages → `PAGE_MOTIF` in `src/App.jsx`
(the `image` entry); other pages → the `backdrop` prop where `<PageHero>` is
rendered (`ContactPage.jsx`, `FaqPage.jsx`, `JewelleryPage.jsx`,
`NotFoundPage.jsx`); journal → `BlogsPage.jsx`; inventory → `InventoryPage.jsx`.
`backdropFocus="x% y%"` moves the crop's point of interest.

**Also fixed on the way:** the journal's caustic-light layer flared white over a
real photo and hid the headline (removed); the inventory page's generic
`.hero>div` rule collapsed the backdrop to an empty box (overridden).

**Verified** on the built app with Supabase mocked: all 12 banner routes load
their photo, run the opening/drift, update `--hp` on scroll, keep the copy on top,
0 console errors; reduced motion static; 390 px viewport, dark and light themes
screenshot-checked; oxlint 0 errors; build clean.

**Notes.** (a) `c547f3b` also contains five small files from another session's
in-progress motion work (`lenis.js`, `SmoothScrollProvider.jsx`,
`MotionPrimitives.*`, `usePageAnimations.js`) that were sitting modified in the
working tree — they passed lint/build/tests; only the attribution is mixed.
(b) The adversarial review workflow for this change did not complete (usage
limit); the checks above are the verification that ran.

## 2. Administrator registration and admin login (`d722887`, `0724dbf`)

**Problem.** Choosing "Administrator" on the register page created a customer:
the form used `supabase.auth.signUp()` like everyone else and only wrote a note
to the enquiries queue, which nothing read. Login always landed on `/account`.

**Fix.** The project's own `register-admin` Edge Function (deployed and configured
on the live project — verified) is now called for staff sign-up
(`src/lib/supabase/registerAdmin.js`). It checks the staff code on the server
against the secret `ADMIN_SIGNUP_CODE`, creates the user already confirmed (no
email), writes `profiles.role = 'admin'`; the page then signs in with the same
password and opens `/admin`. Phone and country are asked of staff because the
function requires them. Customer sign-up is unchanged (`signUp()` only).

Sign-in now reads the profile once and sends an active admin to `/admin`,
everyone else to `/account` (`src/lib/supabase/loginDestination.js`, unit test in
`tests-e2e/login-destination.test.mjs`). `/admin` still asks for the desk unlock
code (`VITE_ADMIN_CODE`, default `123456`) once per browser tab — that is only a
browser lock; the role always comes from the database.

**Security follow-up (`0724dbf`).** The function's guess limiter was keyed per
IP + email, so a new email meant a fresh five-guess budget. The source in
`supabase/functions/register-admin/index.ts` now limits per caller address, never
resets on a correct code, and refuses (503) when its table is unreachable. A
weak password is no longer reported as "already registered". **This needs one
redeploy** (see to-do). The runbook no longer suggests setting the secret to
`123456`.

Docs: `supabase/functions/register-admin/README.md`, section "Admin (staff)
account" in `SIGNUP-FIX-NOW.md`, "Staff accounts" in `SUPABASE-EMAIL-SETUP.md`.

## 3. Customer sign-up / sign-in (`5c2718d`, `1378b73`, `9115f0a`)

- Registration calls only `supabase.auth.signUp()` with
  `{ email (trimmed, lower-cased), password (untouched), options: { emailRedirectTo: origin + '/auth/callback', data: { full_name } } }`.
  Session returned → "Account created successfully" → `/account`. No session →
  "Check your email"; no automatic login, no automatic resend. Resend happens only
  on the button.
- Nothing in the app calls `signInWithOtp` / `/auth/v1/magiclink` / `/otp`
  (supabase-js 2.112 has no `/magiclink` path at all). A `/magiclink` request in
  the Auth logs comes from outside the app — most likely Dashboard → Users →
  "Send magic link". Explained in `SUPABASE-EMAIL-SETUP.md`.
- Sign-in: "Email or password is incorrect." for bad credentials; the unconfirmed
  case is named; no duplicate submits.
- The development-only backend notice (it fetched `/auth/v1/settings` on every
  auth page load) was removed; idle loads of `/register`, `/login`, `/account`,
  `/forgot-password` make no auth request.
- Customer-facing mail-failure copy no longer names SMTP/Supabase/HTTP codes.

## Owner to-do

1. **Confirm email is still ON** on the live project (`mailer_autoconfirm: false`,
   checked 9 Sep). The app's only env file points at the hosted project
   `lkokikjyiohpodhcmjzw`; there is no local Supabase. For sign-ups to create a
   session without mail: Dashboard → Authentication → Providers → Email →
   Confirm email OFF, or `node scripts/supabase-confirm-email.mjs off` with an
   `sbp_` token. See `SIGNUP-FIX-NOW.md`.
2. **Redeploy the staff function once** (limiter fix):
   `supabase functions deploy register-admin` (`supabase/config.toml` keeps
   `verify_jwt = false`, which sign-up requires).
3. **Set the staff code from a prompt, long and random, not `123456`:**
   `read -rsp "Admin signup code: " ADMIN_SIGNUP_CODE && echo` →
   `supabase secrets set ADMIN_SIGNUP_CODE="$ADMIN_SIGNUP_CODE"` → `unset ADMIN_SIGNUP_CODE`.
   No redeploy needed after changing the secret.
4. **Check the limiter table exists:** Dashboard → SQL Editor →
   `select count(*) from public.admin_signup_attempts;` — if it errors, run
   `supabase/migrations/0004_admin_signup_attempts.sql`.
5. **The old "admin" account that came out a customer:**
   `update public.profiles set role = 'admin', account_status = 'active' where email = '…';`
   or delete that user and register again as Administrator.
6. After a customer sign-up, confirm a `public.profiles` row appears; if not,
   apply `supabase/migrations/0003_profiles_on_signup.sql`.
