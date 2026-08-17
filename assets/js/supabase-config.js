/* ============================================================
   NEW GROWN DIAMOND — SUPABASE CONFIGURATION
   ------------------------------------------------------------
   ⚠️  THIS IS THE ONLY FILE WHERE YOU ENTER SUPABASE VALUES.
       Every page reads its configuration from here.

   HOW TO FILL THIS IN
   -------------------
   1. Open your Supabase project dashboard:
        https://supabase.com/dashboard
   2. SUPABASE_URL
        Project Settings → Data API → "Project URL"
        Example: https://abcdefghijklm.supabase.co
   3. SUPABASE_PUBLISHABLE_KEY
        Project Settings → API Keys → "Publishable key"
        It starts with:  sb_publishable_...
        (Older projects may only have the legacy "anon public"
        key — that also works here and is equally browser-safe.)

   SECURITY — READ THIS
   --------------------
   ✅ The publishable / anon key is DESIGNED for browsers.
      Row Level Security (RLS) in the database is what protects
      your data — this key only identifies your project.
   ❌ NEVER paste any of the following into this file or any
      other frontend file:
        - service_role key          (bypasses RLS — server only)
        - secret key (sb_secret_…)  (server only)
        - your database password
   ============================================================ */

window.NGD_SUPABASE_CONFIG = {
  /* 👉 Your Project URL (replace if you move projects) */
  SUPABASE_URL: 'https://lkokikjyiohpodhcmjzw.supabase.co',

  /* 👉 Your Publishable key (browser-safe by design — RLS protects the data) */
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_Ytuv1G6Ga0zqIP3DrCnINw_lTR57e3c'
};
