# Emailed links do not arrive, or do not work

**Re-measured against the live project on 10 September 2026.** Two separate
faults produce the same complaint, and they need different fixes:

## Fault 1: every link points at a machine nobody is running

Measured, not assumed. Asking the project where it would send a recovery link
answers:

```
Site URL                                        http://localhost:3000
http://localhost:5173/auth/callback             allowed
http://localhost:4173/auth/callback             allowed
https://newgrowndiamond.com/auth/callback       NOT allowed -> falls back to http://localhost:3000
```

`http://localhost:3000` is the Supabase default that a project keeps until
somebody changes it. Supabase refuses any redirect that is not on the
allow-list and silently falls back to Site URL, with no error anywhere. So a
link opened from the real domain, or from a shared tunnel address, arrives in
the inbox and then opens a dead address on a machine the customer is not
sitting at. Nothing in the code can override this; the allow-list is checked on
the server.

Reproduce it yourself at any time:

```
npm run check:backend -- --origin https://newgrowndiamond.com
```

### Fixing it without the dashboard

Site URL and the allow-list are project settings rather than database rows, so
no key the site holds can reach them. Supabase's Management API can, with a
**personal access token** from
<https://supabase.com/dashboard/account/tokens> — not the publishable key and
not the service role key.

```
SUPABASE_ACCESS_TOKEN=sbp_... node scripts/fix-auth-config.mjs
```

That prints what is set now and changes nothing. To repair it:

```
SUPABASE_ACCESS_TOKEN=sbp_... node scripts/fix-auth-config.mjs   --site https://newgrowndiamond.com   --add https://newgrowndiamond.com/auth/callback   --add https://www.newgrowndiamond.com/auth/callback   --add http://localhost:5173/auth/callback   --apply
```

Nothing is written without `--apply`; without it the script shows each change
with the old value beside the new one. The same script sets SMTP, taking the
password from an environment variable rather than the command line:

```
SUPABASE_ACCESS_TOKEN=sbp_... SMTP_PASS=abcd... node scripts/fix-auth-config.mjs   --smtp-host smtp.gmail.com --smtp-port 587   --smtp-user you@gmail.com --smtp-sender you@gmail.com   --smtp-name "New Grown Diamond" --smtp-pass-env SMTP_PASS   --apply
```

Revoke the token on that page when you are done.

### Passing a credential without wrestling with the shell

Every operator script takes its credential from the environment first, and
failing that from `.env.local`. So instead of constructing an environment
variable, add the line to that file:

```
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ACCESS_TOKEN=sbp_...
```

That is safe here for two checked reasons: `.gitignore` covers `.env.*`, so the
file is never committed; and `vite.config.js` sets `envPrefix` to `VITE_` and
`NEXT_PUBLIC_`, so Vite copies **only** those two prefixes into the browser
bundle. A name without one of those prefixes cannot reach a visitor.

The rule that matters: never give a privileged key a `VITE_` or `NEXT_PUBLIC_`
name. `SUPABASE_SERVICE_ROLE_KEY` is invisible to the front end;
`VITE_SUPABASE_SERVICE_ROLE_KEY` would be published to everyone.

## Fault 2: the message itself may never be sent

The project uses **Supabase's built-in email service** unless custom SMTP has
been configured. That service is for development: a few messages an hour across
the whole project, and Supabase only guarantees delivery to addresses belonging
to the project's own team. A customer's address gets nothing, with no bounce
and no error on the site. Sign-up is no longer affected — email confirmation is
now OFF (`mailer_autoconfirm: true`), so a new account works immediately and
waits for no link — but **password recovery still depends entirely on this**.

**This is now confirmed, not suspected.** A recovery request from the live site
answers:

```
POST /auth/v1/recover?redirect_to=...  500 (Internal Server Error)
```

and the site shows "The email could not be sent right now." The same endpoint
answers **200** for an address that has no account, because Supabase does not
attempt a send for an unknown address. So the endpoint is healthy and it is the
SEND that fails. That is the mailer, and only two things cause it:

1. **No custom SMTP**, so the built-in service is in use. It sends a few
   messages an hour and only reliably to addresses belonging to the Supabase
   project's own team. Every other recipient fails with exactly this 500.
2. **Custom SMTP is configured, but its host, port, username or password is
   wrong.**

A quick way to tell them apart: request recovery for the address you sign in to
Supabase with. If that one arrives and a customer's does not, it is cause 1.

To test delivery for any one address:

```
npm run check:backend -- --recovery you@example.com
```

A `429 over_email_send_rate_limit` is the hourly cap rather than a broken
mailer. Anything else is printed verbatim.

## While the mailer is down, nobody has to stay locked out

There are two ways, and both skip email entirely. Prefer the first: the
customer chooses their own password and the desk never handles one.

### Send them a recovery link by hand

```
SUPABASE_SERVICE_ROLE_KEY=... node scripts/recovery-link.mjs someone@example.com   --origin https://newgrowndiamond.com
```

It prints a link to this site's own reset page carrying the same recovery token
the email would have contained. Send it over whatever channel you already use
with that customer. It works no matter what Site URL and the allow-list say,
because the address is ours rather than one Supabase has to approve.

The link is single use and it expires. Whoever opens it can set that account's
password, so send it to that customer and nobody else, and only once you are
satisfied they are who they say. That is the same trust the emailed link asks
for; it is just travelling by a different road.

### Or set a password for them


Recovery is the only flow that needs email — sign-up does not, now that
confirmation is off. So an account someone cannot get into can be handled by
the desk directly:

```
SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-password.mjs someone@example.com
```

It finds the account, asks for a new password twice with the typing hidden, and
sets it. Tell the person out of band and ask them to change it from their
account page once they are in.

The service role key can read and write every row and bypasses every policy.
Pass it on that one command line only. It must never appear in `.env.local`, in
any `VITE_` variable, or in any committed file — anything named `VITE_` is
compiled into the bundle and served to every visitor. If it has ever been
pasted somewhere it should not be, rotate it under Project Settings, API.

## The cause

The project is using **Supabase's built-in email service**. That service is
meant for development only. It sends a handful of messages per hour across the
entire project, and Supabase's own documentation says not to rely on it for
production. Once the cap is reached — which a few test sign-ups will do — every
further sign-up fails with the 429 above until the hour rolls over.

**This cannot be fixed in the code.** No amount of retrying, and no change to
the front end, raises that limit. It needs an SMTP provider configured on the
project.

---

## Fix: connect your own SMTP (about 15 minutes)

### 1. Get an SMTP sender

Any of these work. All have a free tier that comfortably covers a diamond
desk's sign-up volume:

| Provider | Free tier | Note |
|---|---|---|
| **Resend** | 3,000/month | Simplest to set up; good choice if you have no preference |
| **Brevo** (ex-Sendinblue) | 300/day | Popular in India, no card required |
| **Amazon SES** | 62,000/month from EC2 | Cheapest at volume, most setup |
| **Zoho ZeptoMail** | 10,000 one-off free | Useful if you already use Zoho Mail |

These all send **as your own domain** — `newgrowndiamond.com` — which is what
you want long term, and they need DNS records to prove you own it.

### The fastest route if you have no domain set up yet

**Gmail's own SMTP.** It needs no domain, no DNS and no new account, and it
sends as the Gmail address itself, so nothing rejects it for a mismatch. Good
for a few hundred messages a day, which is far more than password recovery
needs. Use it to get recovery working today, and move to a domain sender later
for customer-facing mail.

1. The Google account must have **2-Step Verification on**. App passwords do
   not exist without it.
2. Go to the Google account's **App passwords** page, create one, and copy the
   16 characters. That is not the account password, and it can be revoked on
   its own.
3. In Supabase, under **Project Settings → Authentication → SMTP Settings**,
   enable *Custom SMTP*:

   ```
   Host      smtp.gmail.com
   Port      587
   Username  the full Gmail address
   Password  the 16-character app password, no spaces
   Sender    the same Gmail address
   ```

4. Save, then confirm it end to end:

   ```
   npm run check:backend -- --recovery you@example.com
   ```

The sender address must match the account the app password belongs to. Gmail
rewrites a mismatched sender, and Supabase reads that as a failure.

### 2. Verify the domain

The provider will give you DNS records — typically SPF, DKIM and sometimes a
return-path CNAME. Add them wherever `newgrowndiamond.com` is managed. Wait for
the provider to show the domain as verified before continuing; a half-verified
domain sends mail that lands in spam, which looks identical to not sending.

### 3. Enter the details in Supabase

**Dashboard → Project Settings → Authentication → SMTP Settings** → enable
*Custom SMTP*:

- **Sender email** — `noreply@newgrowndiamond.com` (or `desk@`)
- **Sender name** — `New Grown Diamond`
- **Host / Port** — from your provider (usually port `587`)
- **Username / Password** — the provider's SMTP credentials, **not** your
  account password

Then raise **Rate limit for sending emails** on the same page. The default is
deliberately low for the built-in service; with your own SMTP, 30–100 per hour
is reasonable.

### 4. Set the URLs — this part matters

**Dashboard → Authentication → URL Configuration**

- **Site URL** — `https://newgrowndiamond.com`

  If this is still `http://localhost:3000` — which is the default, and stays
  that way in any project nobody revisited — then every confirmation link in
  every email points at a machine the customer is not sitting at. The email
  arrives, the link is clicked, and nothing happens.

- **Redirect URLs** — add **all** of these:

  ```
  https://newgrowndiamond.com/auth/callback
  https://www.newgrowndiamond.com/auth/callback
  http://localhost:4173/auth/callback
  http://localhost:5173/auth/callback
  ```

  Add the address of any other place the site is opened from — a preview
  deployment, or a shared tunnel URL — with the same `/auth/callback` path.
  That one path is now the only return address the site uses: password
  recovery was changed to use it too, so there is one entry to get right per
  origin rather than two.

  The site now tells Supabase where to send people back to
  (`emailRedirectTo`), but Supabase **refuses any redirect not on this
  allow-list and silently falls back to Site URL** — with no error anywhere to
  explain it. Missing entries here look exactly like a broken link.

### 5. Test

Sign up with a real address you can open. You should get the mail within a
minute, and clicking the link should land on `/auth/callback` showing
**"Email confirmed"**.

---

## What was fixed in the code

These were real problems regardless of SMTP, and are done:

- **`/auth/callback` now exists.** Previously nothing handled the return from a
  confirmation link. The tokens were consumed silently and the visitor landed
  on a page with no message — working and indistinguishable from broken. It
  also handles the case nothing did before: an **expired or already-used
  link**, which produces an error in the URL fragment and no session.

- **`emailRedirectTo` is sent** on sign-up and on resend, so links point at the
  site the person actually used rather than at whatever Site URL happens to
  say. (Still needs step 4 — Supabase must be told the URL is allowed.)

- **The 429 now says something true.** It was being reported as *"Too many
  attempts. Please wait a few minutes and try again"* — which blames the
  customer for a server-side cap they cannot influence and sends them off to
  retry something that will fail again. It now says the mail service has hit
  its limit and to contact the desk.

## While you set SMTP up

Any customer who is stuck can be activated by hand:

**Dashboard → Authentication → Users** → find them → **⋮** → *Confirm email*.

They can then sign in normally with the password they chose.

## Where a `/auth/v1/magiclink` request comes from

Not from this app. supabase-js 2.112 has no code path to `/magiclink` (its OTP
method posts to `/otp`), and the built app — driven through sign-up, sign-in,
resend and forgot-password with every request logged — calls only `/signup`,
`/token`, `/resend` (on the Resend button) and `/recover`. The word `magiclink`
does not occur in the source, the bundle, or the git history.

A `POST /auth/v1/magiclink` therefore comes from another client: the Supabase
Dashboard's **Users → Send magic link** action, a supabase-js v1 client, or a
hand-typed request. In Dashboard → Logs → Auth, filter path `/magiclink` and
read the user-agent and referer on the hit. "Error sending confirmation email"
on that request means the project's mailer failed — the same mailer this
document is about.

## Staff accounts

"Administrator" on the sign-up form does not go through `signUp()`. It calls
the `register-admin` Edge Function (`supabase/functions/register-admin`), which
checks the staff code against the server-side secret `ADMIN_SIGNUP_CODE`,
creates the user already confirmed — no email involved — and writes
`profiles.role = 'admin'`. The form then signs in and opens `/admin`. Sign-in
sends active administrators to `/admin` directly; everyone else lands on
`/account`.
