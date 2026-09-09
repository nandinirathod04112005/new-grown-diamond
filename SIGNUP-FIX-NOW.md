# Sign-up को अभी चालू करने के लिए — सिर्फ़ एक setting

## क्या हो रहा है

आपके Supabase project पर मैंने अभी test किया:

```
signup  →  500  "Error sending confirmation email"
```

Supabase confirmation email भेजने की कोशिश करता है, **fail हो जाता है, और पूरा
signup cancel कर देता है।** इसलिए:

- `auth.users` में कुछ नहीं आता
- `profiles` में कुछ नहीं आता
- कोई link नहीं आता (email गया ही नहीं)
- Login नहीं होता (account बना ही नहीं)

**ये चारों एक ही problem हैं।** Code में कोई गलती नहीं है — यह Supabase की
email setting है, जो सिर्फ़ आपके dashboard से बदल सकती है।

---

## सबसे आसान तरीका — एक command

Dashboard में toggle ढूंढने की ज़रूरत नहीं। बस एक token बनाएँ और एक command चलाएँ:

1. यह link खोलें: **https://supabase.com/dashboard/account/tokens**
2. **Generate new token** → कोई भी नाम दें → **Generate** → जो `sbp_...` दिखे उसे copy करें
3. VS Code के terminal में (PowerShell):

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_यहाँ_paste_करें"
node scripts/supabase-confirm-email.mjs off
```

बस। Script खुद setting बदलेगी और फिर वापस पढ़कर confirm करेगी:

```
Done. Confirm email is now OFF.
```

Token कहीं save नहीं होता, print नहीं होता, सिर्फ़ api.supabase.com को जाता है।
बाद में वापस चालू करना हो तो `off` की जगह `on` लिखें।

---

## या dashboard से — 30 सेकंड

1. Browser में खोलें: **https://supabase.com/dashboard**
2. Project **`lkokikjyiohpodhcmjzw`** चुनें
3. बाईं ओर menu में **Authentication** पर click करें
4. Authentication के अंदर **Providers** पर click करें
5. List में **Email** पर click करें (वो expand होगा)
6. **"Confirm email"** नाम का toggle ढूंढें — वो अभी **ON** है
7. उसे **OFF** करें
8. नीचे **Save** दबाएँ

बस। अब website पर register करके देखें — तुरंत account बनेगा और login हो जाएगा।

---

## अगर आपने SMTP settings डाली थीं

500 error का मतलब आमतौर पर यह होता है कि custom SMTP डाला गया है लेकिन
username / password / host गलत है। ऊपर वाला toggle OFF करने से यह भी bypass
हो जाएगा — email की ज़रूरत ही नहीं रहेगी।

बाद में जब चाहें, `SUPABASE-EMAIL-SETUP.md` में सही SMTP लगाने के steps हैं।
वो आज का काम नहीं है।

---

## Toggle OFF करने के बाद अगर "No access" दिखे

तो `profiles` table में row नहीं बन रही — इसके लिए एक trigger चाहिए।
वो तैयार है: `supabase/migrations/0003_profiles_on_signup.sql`

Dashboard → **SQL Editor** → उस file का पूरा content paste करें → **Run**।
यह safe है — अगर trigger पहले से है तो कुछ नहीं बिगड़ेगा।

---

## जो customer अभी अटके हैं

Dashboard → **Authentication** → **Users** → उनका नाम ढूंढें → **⋮** → **Confirm email**

फिर वो अपने पासवर्ड से login कर पाएँगे।

## Admin (staff) account कैसे बनता है — अब असली admin बनता है

पहले "Administrator" चुनकर register करने पर account **customer** ही बनता था — form सिर्फ़ एक
note लिखता था, role कोई नहीं बदलता था। अब:

1. Register page पर **Administrator** चुनें; staff code, नाम, email, phone, country और password भरें।
2. Form `register-admin` Edge Function को call करता है (आपके project पर deployed और configured है —
   जाँच लिया)। वही code को **server पर** check करता है, account को confirmed बनाता है और
   `profiles.role = 'admin'` लिखता है। कोई email नहीं जाता।
3. उसी email/password से तुरंत sign-in होकर `/admin` खुल जाता है।

**कौन-सा code चलेगा?** Server वाला secret `ADMIN_SIGNUP_CODE`। यह `VITE_ADMIN_CODE` (123456)
**नहीं** है, और उसके बराबर भी **नहीं** होना चाहिए — 123456 हर visitor को site के JavaScript में
दिखता है, जबकि `ADMIN_SIGNUP_CODE` admin बनाने की पूरी चाबी है। लंबा, random code रखें और उसे
कहीं लिखें नहीं (इस file में भी नहीं)। Set करने का तरीका — prompt पर type होगा, shell history में
नहीं जाएगा:

```sh
read -rsp "Admin signup code: " ADMIN_SIGNUP_CODE && echo
supabase secrets set ADMIN_SIGNUP_CODE="$ADMIN_SIGNUP_CODE"
unset ADMIN_SIGNUP_CODE
```

Secret बदलने पर redeploy ज़रूरी नहीं। **लेकिन function एक बार redeploy ज़रूर करें** — repo में
`supabase/functions/register-admin/index.ts` का guess-limiter ठीक किया गया है (deployed पुराना
version हर नए email पर 5 नई कोशिशें दे देता था):

```sh
supabase functions deploy register-admin
```

`supabase/config.toml` में `verify_jwt = false` रखा है — register के समय कोई session नहीं होता, इसलिए
यह ज़रूरी है। एक IP से 5 गलत कोशिशों पर 15 मिनट का block है (`admin_signup_attempts` table —
Dashboard → SQL Editor में `select count(*) from public.admin_signup_attempts;` से check करें; न हो
तो `supabase/migrations/0004_admin_signup_attempts.sql` चलाएँ)।

**Login:** admin से sign-in करने पर अब सीधे `/admin` खुलता है; customer `/account` पर। `/admin` पर
desk का code एक बार माँगा जाता है — यह browser का lock है, role हमेशा database से आता है।

**पुराना "admin" account जो customer बन गया था:** Dashboard → SQL Editor में
`update public.profiles set role = 'admin', account_status = 'active' where email = '...';`
चलाएँ, या उस user को delete करके दोबारा Administrator से register करें।

## `/auth/v1/magiclink` कहाँ से आ रहा है

इस codebase से नहीं। supabase-js 2.112 के पास `/magiclink` endpoint है ही नहीं (OTP के लिए `/otp`
है), और पूरे workspace, built bundle और git history में `magiclink` / `signInWithOtp` कहीं नहीं
है — तीन अलग तरीकों से जाँचा (source, built app को browser में चलाकर हर request log करके, history)।
App सिर्फ़ `/signup`, `/token`, `/resend` (Resend बटन पर) और `/recover` call करता है।

वह request Supabase Dashboard → Authentication → Users → **Send magic link** से आती है (या किसी
hand-typed REST call से)। Dashboard → Logs → Auth में path `/magiclink` filter करके user-agent /
referer देखें। "Error sending confirmation email" का मतलब project का mailer fail हुआ — app का
इससे लेना-देना नहीं।

**Confirm email अभी भी ON है** (`/auth/v1/settings` → `mailer_autoconfirm: false`, आज जाँचा)।
App `.env.local` से hosted project `lkokikjyiohpodhcmjzw` पर ही चलता है — कोई local Supabase नहीं
है। इसलिए customer sign-up अभी भी email माँगेगा; ऊपर वाली एक setting OFF करें। जो user unconfirmed
पड़ा है वह उसी ON setting के समय बना था।
