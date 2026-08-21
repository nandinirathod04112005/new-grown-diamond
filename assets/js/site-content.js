/* ============================================================
   NEW GROWN DIAMOND — public CMS content loader
   ------------------------------------------------------------
   Applies admin-edited copy from public.site_content onto
   elements tagged with:

     data-cms="key.field"        → element textContent
     data-cms-href="key.field"   → link href (http/https/relative only)
     data-cms-src="key.field"    → image src  (http/https/relative only)

   The page's built-in copy IS the fallback: only ACTIVE rows
   with non-empty values override it, so a missing row, an
   inactive section, or an unreachable Supabase leaves the page
   exactly as designed — never blank. Everything lands via
   textContent or validated URL attributes; admin-entered HTML
   is rendered as literal text and can never execute.
   ============================================================ */
(function () {
  'use strict';

  function collect(attr) {
    var map = {};
    document.querySelectorAll('[' + attr + ']').forEach(function (el) {
      var ref = (el.getAttribute(attr) || '').split('.');
      if (ref.length !== 2) return;
      (map[ref[0]] = map[ref[0]] || []).push({ el: el, field: ref[1], attr: attr });
    });
    return map;
  }

  /* Only navigable web URLs — javascript:, data: and friends never bind. */
  function safeUrl(value) {
    try {
      var parsed = new URL(String(value), location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? String(value) : '';
    } catch (_error) {
      return '';
    }
  }

  async function init() {
    if (!window.ngdSupabase) return;
    var textTargets = collect('data-cms');
    var hrefTargets = collect('data-cms-href');
    var srcTargets = collect('data-cms-src');
    var keys = {};
    [textTargets, hrefTargets, srcTargets].forEach(function (map) {
      Object.keys(map).forEach(function (key) { keys[key] = true; });
    });
    var keyList = Object.keys(keys);
    if (!keyList.length) return;

    try {
      var res = await window.ngdSupabase.from('site_content')
        .select('key,heading,subheading,body,cta_text,cta_url,cta2_text,cta2_url,image_url,secondary_image_url,active')
        .in('key', keyList).eq('active', true);
      if (res.error) throw res.error;
      (res.data || []).forEach(function (row) {
        (textTargets[row.key] || []).forEach(function (target) {
          var value = row[target.field];
          if (typeof value === 'string' && value.trim()) target.el.textContent = value.trim();
        });
        (hrefTargets[row.key] || []).forEach(function (target) {
          var url = safeUrl(row[target.field]);
          if (url) target.el.setAttribute('href', url);
        });
        (srcTargets[row.key] || []).forEach(function (target) {
          var url = safeUrl(row[target.field]);
          if (url) target.el.setAttribute('src', url);
        });
      });
    } catch (error) {
      /* The built-in copy stays — a content read must never hurt the page. */
      console.warn('[NGD Content] live copy unavailable, using the built-in text', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
