/**
 * Where an emailed link should bring the visitor back to.
 *
 * WHY THIS IS PASSED EXPLICITLY. With no `emailRedirectTo`, Supabase builds
 * every confirmation and recovery link from the project's **Site URL** in the
 * dashboard. That value defaults to `http://localhost:3000`, and a project
 * that was set up and never revisited keeps it — so every link in every email
 * points at a machine that is not the customer's. The email arrives, the link
 * is clicked, and nothing happens. Naming the redirect here means the link
 * points at the site the person actually signed up on, whether that is the
 * production domain, a preview deployment, or a laptop.
 *
 * ONE DASHBOARD SETTING IS STILL REQUIRED, and it cannot be done from code:
 * the URL must appear in Authentication → URL Configuration → Redirect URLs.
 * Supabase refuses any redirect that is not on that allow-list and silently
 * falls back to Site URL — which is the same broken link again, with no error
 * to explain it. See SUPABASE-EMAIL-SETUP.md.
 */

/** The route that reads the outcome of a link and tells the visitor. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

/*
 * The address the site is reachable at from ANY device.
 *
 * Kept here rather than imported from config/seo.js, which is the other place
 * this string lives: that module pulls in the whole journal archive to build
 * its descriptions, and the sign-in path should not carry the blog. The two
 * must agree — if the domain changes, change it in both.
 *
 * VITE_PUBLIC_SITE_URL overrides it, which is what a review tunnel wants: set
 * it to the tunnel address and recovery links work on a phone while the tunnel
 * is up, without the production domain having to be live yet.
 */
const PRODUCTION_SITE_URL = 'https://newgrowndiamond.com';
const configuredSiteUrl = (import.meta.env?.VITE_PUBLIC_SITE_URL || PRODUCTION_SITE_URL).replace(/\/+$/, '');
/*
 * A Quick Tunnel value left in .env.local must never poison future emails
 * after that random hostname expires — so a tunnel address is ignored unless
 * a SECOND, separately named flag says it is deliberate.
 *
 * Two switches rather than one, because they answer different questions. The
 * URL says where; this says "yes, I know that address is temporary, and I want
 * recovery mail to use it anyway". A tunnel URL left behind on its own is
 * still ignored, which is the accident the rule above exists to prevent — but
 * a review session that genuinely needs recovery links to come back to the
 * tunnel is no longer forced to choose between that and having no working
 * password reset at all.
 *
 * Both must be removed before a production build. The flag is deliberately
 * verbose so it cannot be mistaken for something routine.
 */
const ALLOW_TEMPORARY_HOST = String(import.meta.env?.VITE_ALLOW_TUNNEL_AUTH_LINKS) === 'true';
const PUBLIC_SITE_URL = (() => {
  try {
    const temporary = new URL(configuredSiteUrl).hostname.endsWith('.trycloudflare.com');
    return temporary && !ALLOW_TEMPORARY_HOST ? PRODUCTION_SITE_URL : configuredSiteUrl;
  } catch {
    return PRODUCTION_SITE_URL;
  }
})();

/**
 * Hosts that only exist on the machine looking at them.
 *
 * A link is read on a DIFFERENT DEVICE from the one that asked for it — that
 * is the whole point of sending an email. `localhost` on a phone is the phone,
 * and `192.168.x.x` is whatever that address means on the network the phone
 * happens to be on. Neither can ever reach a laptop's dev server, so a recovery
 * link built from one is broken before it is sent.
 */
function nonDurableOrigin(hostname) {
  return hostname === 'localhost'
    || hostname === '0.0.0.0'
    || hostname === '[::1]'
    || hostname === '::1'
    || hostname.endsWith('.local')
    || /^127\./.test(hostname)
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    || hostname.endsWith('.trycloudflare.com');
}

/**
 * Absolute, because Supabase requires it.
 *
 * BUILT FROM THE CURRENT ORIGIN WHEREVER THAT ORIGIN IS PUBLIC, so a preview
 * deployment does not send people to production and a live site does not send
 * them somewhere else. Where it is NOT public, the site's own address is used
 * instead — the reported failure was a recovery email requested from a laptop
 * and opened on a phone, where the link read `http://localhost:5173/...` and
 * the phone, correctly, tried itself and found nothing.
 *
 * Quick Tunnel hosts are never used for emailed links: although public, they
 * work only while the tunnel process and its random DNS name still exist. A
 * recovery mail sent from one of those carries an address that outlives the
 * temporary hostname. They therefore fall back to the stable PUBLIC_SITE_URL.
 */
export function authRedirectTo() {
  if (typeof window === 'undefined') return undefined;
  const { protocol, hostname, origin } = window.location;
  if (!['http:', 'https:'].includes(protocol)) {
    throw new Error('Email confirmation requires an HTTP or HTTPS website address.');
  }
  const base = nonDurableOrigin(hostname) ? PUBLIC_SITE_URL : origin;
  return `${base}${AUTH_CALLBACK_PATH}`;
}
