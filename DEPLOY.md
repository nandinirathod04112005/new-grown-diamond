# Deploying New Grown Diamond

Everything here has been tested against a real production build served by a
static server, not against the dev server. The two behave differently in ways
that matter, and every item below is something that was actually observed
rather than assumed.

---

## 1. Environment variables

Set these on the host **before** building. Vite inlines them at build time, so
changing them later requires a rebuild — restarting the server is not enough.

```
VITE_SUPABASE_URL=https://lkokikjyiohpodhcmjzw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
accepted as aliases, because Supabase's dashboard hands out those names and
pasting them in used to leave the site silently credential-less.

**Only ever the publishable key.** Anything Vite exposes to the browser is
readable by every visitor; a `service_role` or `sb_secret_` key placed here is
published, not configured. Row Level Security is what protects the data.

There is an automated check for this — see §5.

---

## 2. The one thing that will break the deploy

This app decides what to render from `window.location.pathname`. `/blogs` and
`/login` are **not files on disk**, so a static host answers **404** to every
URL except `/` unless it is told to rewrite.

Measured on a bare static server with no rewrite:

```
200  /
404  /blogs      404  /login      404  /register
404  /account    404  /diamonds   404  /about
```

Every shared link, every refresh, every indexed page — broken.

Configuration for the common hosts is committed:

| Host | File | Notes |
|---|---|---|
| Netlify, Cloudflare Pages | `public/_redirects` | copied into `dist/` by the build |
| Vercel | `vercel.json` | rewrites everything except `/assets/` |
| Apache / cPanel | `public/.htaccess` | needs `mod_rewrite` |

**nginx** has no file here — add this to the server block:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

The rewrite must be a **200**, not a 301 or 302. The browser has to keep the URL
it asked for or the router has nothing to read.

---

## 3. Supabase configuration (dashboard, not code)

Two settings live outside this repository and both affect whether the site
works for real visitors.

**Email confirmation.** The project currently has `mailer_autoconfirm: false`,
so a new account is created but cannot sign in until a confirmation link is
opened. Supabase's built-in mailer is rate limited to a handful of messages an
hour and often does not deliver at all — this is the usual reason "sign up does
nothing".

*Authentication → Providers → Email*: either turn **Confirm email** off, or
configure your own SMTP. The sign-in page detects the unconfirmed state and
offers a resend, but it cannot send mail the project will not send.

**Redirect URLs.** *Authentication → URL Configuration*: add the production
origin to **Site URL** and **Redirect URLs**, or confirmation and password
reset links will bounce visitors back to `localhost`.

---

## 4. Database

| Feature | Table | Status |
|---|---|---|
| Inventory | `public.diamonds` | live |
| Sign in / register | Supabase Auth | live |
| Profile | `public.profiles` | live |
| Journal | `public.blogs` | created — see `supabase/blogs.sql` |

`supabase/blogs.sql` holds the table, its index and its RLS policies. If the
journal is ever rebuilt from scratch, that file is the source of truth.

---

## 5. Pre-deploy checks

```bash
npm run build                 # must exit 0
npx oxlint src/               # must report no errors
```

Then confirm no secret material reached the bundle. The check looks for actual
key VALUES — an `sb_secret_` key or a JWT whose role is `service_role` — not for
the words themselves: the Supabase library names both key types in its own
code, and the site's fetch helpers contain a guard that refuses to send a
secret key, so a plain text search reports a "leak" that is not one.

```bash
node -e "const fs=require('fs'),p=require('path');const f=[];\
(function w(d){for(const n of fs.readdirSync(d)){const q=p.join(d,n);\
fs.statSync(q).isDirectory()?w(q):/\.(js|css|html|map|json)$/.test(n)&&f.push(q)}})('dist');\
const hits=[];for(const x of f){const s=fs.readFileSync(x,'utf8');\
if(/sb_secret_[A-Za-z0-9_-]{16,}/.test(s))hits.push(x);\
for(const m of s.matchAll(/eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g)){try{\
if(JSON.parse(Buffer.from(m[0].split('.')[1],'base64url')).role==='service_role')hits.push(x)}catch{}}}\
console.log(hits.length?'LEAK: '+hits.join(', '):'PASS: no secret key in dist')"
```

Finally, serve `dist/` and load `/blogs` **directly** (not by clicking through).
If it 404s, the rewrite in §2 is not in effect — that is the single most common
way this deploy goes wrong.

---

## 6. Caching

Asset filenames are content-hashed, so they are safe to cache forever.
`index.html` must **not** be, or returning visitors keep an old bundle pointing
at assets that no longer exist. `vercel.json` and `.htaccess` already set this;
on nginx or a CDN, set it yourself.

---

## 7. Known weight

`dist` is about 3.0 MB, dominated by:

- `cvd-furnace.webm` — 1.30 MB, real furnace footage, lazily loaded
- `cut-stone.jpg` — 0.38 MB
- `index.js` — 0.34 MB (105 kB gzipped)

Three.js is **not** in the entry chunk; it loads only when a device accepts the
interactive stone.

The CVD schematic was a 2.2 MB PNG and is now a 236 kB WebP — visually
identical at 2× magnification, 89% smaller. If other large PNGs are added
later, convert them the same way before shipping.
