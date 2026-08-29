# New Grown Diamond — frontend architecture

React 19 + Vite 8 + React Router 7. Premium diamond-first storefront, roughly
75% diamond content to 25% jewellery, reading from the existing Supabase
project that also serves the legacy static site on `main`.

## Directory map

```
src/
├── main.jsx                    Entry point. Guards on the Supabase environment.
├── lib/
│   ├── supabase/
│   │   ├── env.js              Reads + validates VITE_ vars. Never throws.
│   │   ├── client.js           The ONLY createClient in the codebase.
│   │   ├── diamonds.js         (Phase 3) list / detail / featured / similar
│   │   ├── jewellery.js        (Phase 5) + jewellery_images joins
│   │   ├── account.js          (Phase 7) favourites, holds, quotes, enquiries
│   │   ├── admin.js            (Phase 7) writes, RPCs, register-admin invoke
│   │   └── content.js          (Phase 2) site_content, site_settings, seo_pages
│   ├── motion/                 gsap registration, Lenis instance, matchMedia
│   ├── constants.js            SHAPES, COLOURS, CLARITIES, CUTS
│   └── format.js               carat, price, currency, availability
├── providers/                  Auth, Lenis, SiteSettings
├── hooks/                      useDiamonds, useReducedMotion, useInView…
├── styles/                     tokens.css, reset.css, global.css
├── components/
│   ├── primitives/             Button, Eyebrow, Heading, Field, Divider
│   ├── layout/                 Header, Nav, MegaMenu, MobileMenu, Footer
│   ├── motion/                 Reveal, SplitLines, Parallax, PageTransition
│   ├── three/                  DiamondScene + capability gate (lazy only)
│   ├── product/                DiamondCard, JewelleryCard, SpecTable
│   └── feedback/               Skeleton, EmptyState, EnvironmentNotice
├── sections/                   home/, diamonds/, jewellery/ page sections
├── pages/                      public/, auth/, account/, admin/
└── assets/                     brand/, fonts/
```

Empty directories carry a `.gitkeep` so the agreed structure is visible in the
repository. Delete each one as real files land.

## Rules that hold across the codebase

**One Supabase client.** `lib/supabase/client.js` owns the only
`createClient` call. Everything else imports `supabase` or `getSupabase()`.

**Environment variables are public.** Vite inlines every `VITE_` variable into
the shipped bundle. The project URL and publishable key belong there; a
service-role or `sb_secret_` key never does. `env.js` actively rejects a key
that looks server-only.

**Storefront reads are constrained by RLS.** The database only exposes rows
where `active = true AND archived_at IS NULL`. Every product query repeats
those filters and names its columns explicitly — `select('*')` is banned, so
that `internal_notes` and `created_by` are never fetched.

**The database is read-only to this project.** No migrations, no policy edits,
no Edge Function changes. The schema is owned by the deployment on `main`.

**Path alias.** `@/` resolves to `src/`.

## Relationship to `main`

`main` holds the live static site (Bootstrap + vanilla JS) that currently
serves production. This branch shares its Supabase project but not its git
history — the two are unrelated roots and will never merge. Cutover is a
deliberate swap of the deploy root, not a merge.
