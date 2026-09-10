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

## Fault 2: the message itself may never be sent

The project uses **Supabase's built-in email service** unless custom SMTP has
been configured. That service is for development: a few messages an hour across
the whole project, and Supabase only guarantees delivery to addresses belonging
to the project's own team. A customer's address gets nothing, with no bounce
and no error on the site. Sign-up is no longer affected — email confirmation is
now OFF (`mailer_autoconfirm: true`), so a new account works immediately and
waits for no link — but **password recovery still depends entirely on this**.

To test delivery for one address you can open:

```
npm run check:backend -- --recovery you@example.com
```

A `429 over_email_send_rate_limit` in that output is the service's cap and
cannot be fixed in the code. Anything else that is not 200 is printed verbatim.

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

You will need a **domain you control** — `newgrowndiamond.com`. Sending as
`@gmail.com` will not work: providers reject it, and Gmail's own DMARC policy
makes it bounce.

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
