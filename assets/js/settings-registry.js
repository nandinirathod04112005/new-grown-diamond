/* ============================================================
   NEW GROWN DIAMOND — site settings registry
   ------------------------------------------------------------
   The stable setting keys the Settings console and the public
   loader agree on — frontend logic always addresses settings by
   these keys, never by generated row ids. Field types drive the
   admin form and its validation:

     text · textarea · email · url · tel · toggle

   `media: true` adds a site-media library picker.
   `adminOnly: true` marks keys the database refuses to serve to
   the public (see the public-read policy in
   supabase/site-settings.sql) — the browser storefront never
   sees them.

   SECRETS NEVER BELONG HERE: no SMTP passwords, API keys,
   service_role key or signup codes — settings are readable
   website configuration, nothing more.
   ============================================================ */
(function () {
  'use strict';

  window.NGD_SETTINGS_SECTIONS = [
    { id: 'company', label: 'Company', fields: [
      { key: 'company_name', label: 'Company name', type: 'text', required: true,
        placeholder: 'New Grown Diamond' },
      { key: 'brand_short_name', label: 'Short brand name', type: 'text',
        hint: 'Shown in the header when set; otherwise the company name is used.' },
      { key: 'company_tagline', label: 'Company tagline', type: 'text' },
      { key: 'company_description', label: 'Company description', type: 'textarea' },
      { key: 'logo_url', label: 'Logo URL', type: 'url', media: true,
        hint: 'Replaces the ◆ brand mark in the header and footer when set.' },
      { key: 'favicon_url', label: 'Favicon URL', type: 'url', media: true }
    ] },
    { id: 'contact', label: 'Contact', fields: [
      { key: 'contact_email', label: 'Primary email', type: 'email' },
      { key: 'support_email', label: 'Support email', type: 'email' },
      { key: 'contact_phone', label: 'Primary phone', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'whatsapp_number', label: 'WhatsApp number', type: 'tel',
        hint: 'Digits with country code — public WhatsApp links are built from it.' },
      { key: 'address_line', label: 'Address', type: 'textarea' },
      { key: 'address_city', label: 'City', type: 'text' },
      { key: 'address_state', label: 'State', type: 'text' },
      { key: 'address_country', label: 'Country', type: 'text' },
      { key: 'address_postal_code', label: 'Postal code', type: 'text' }
    ] },
    { id: 'social', label: 'Social', fields: [
      { key: 'social_instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/…' },
      { key: 'social_facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/…' },
      { key: 'social_linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/company/…' },
      { key: 'social_youtube', label: 'YouTube', type: 'url', placeholder: 'https://youtube.com/@…',
        hint: 'Stored now; appears once the footer design carries a YouTube icon.' },
      { key: 'social_twitter', label: 'X / Twitter', type: 'url', placeholder: 'https://x.com/…' },
      { key: 'social_pinterest', label: 'Pinterest', type: 'url', placeholder: 'https://pinterest.com/…',
        hint: 'Stored now; appears once the footer design carries a Pinterest icon.' }
    ] },
    { id: 'website', label: 'Website', fields: [
      { key: 'default_currency', label: 'Default currency', type: 'text', placeholder: 'USD' },
      { key: 'default_country', label: 'Default country', type: 'text', placeholder: 'India' },
      { key: 'site_language', label: 'Website language', type: 'text', placeholder: 'en' },
      { key: 'contact_form_recipient', label: 'Contact form recipient email', type: 'email', adminOnly: true,
        hint: 'Admin-only — the database never serves this key to the public site.' },
      { key: 'footer_copyright', label: 'Footer copyright text', type: 'text',
        hint: 'Replaces the footer’s © line verbatim when set.' }
    ] },
    { id: 'business', label: 'Business features', fields: [
      { key: 'feature_diamond_enquiry', label: 'Diamond enquiries enabled', type: 'toggle', defaultOn: true,
        hint: 'Off hides the Diamond enquiry subject on the contact form.' },
      { key: 'feature_jewellery_enquiry', label: 'Jewellery enquiries enabled', type: 'toggle', defaultOn: true,
        hint: 'Off hides Enquire Now on jewellery pieces and the contact subject.' },
      { key: 'feature_quotes', label: 'Quote requests enabled', type: 'toggle', defaultOn: true },
      { key: 'feature_holds', label: 'Hold requests enabled', type: 'toggle', defaultOn: true },
      { key: 'feature_inspections', label: 'Inspection requests enabled', type: 'toggle', defaultOn: true,
        hint: 'Toggles hide the public buttons — no data is ever deleted.' }
    ] },
    { id: 'display', label: 'Display', fields: [
      { key: 'announcement_enabled', label: 'Announcement bar enabled', type: 'toggle', defaultOn: false },
      { key: 'announcement_text', label: 'Announcement text', type: 'text' },
      { key: 'announcement_url', label: 'Announcement link', type: 'url',
        hint: 'Optional — adds a “Learn more” link to the bar.' },
      { key: 'maintenance_mode', label: 'Maintenance mode', type: 'toggle', defaultOn: false,
        hint: 'Shows a holding screen on the public site. The Admin Console and the login page always stay reachable.' }
    ] }
  ];
})();
