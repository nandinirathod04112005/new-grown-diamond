/* ============================================================
   NEW GROWN DIAMOND — admin SEO Manager (LIVE)
   ------------------------------------------------------------
   Edits public.seo_pages by stable page key (the registry in
   seo-registry.js — frontend logic never uses generated ids).
   The overview table shows every managed page with its honest
   state (Live / Inactive / Built-in), indexing and tag lengths.
   The editor prefills built-in tags for unsaved pages, counts
   characters against the recommended ranges (warning only —
   length never blocks a save), previews the Google result and
   the social share card live, and picks share images from the
   site-media library. Validation blocks only real problems:
   a missing title/description or a non-absolute canonical.
   Only active admins pass the guard, and RLS
   (supabase/seo-pages.sql) is the real enforcement.
   ============================================================ */
(function () {
  'use strict';

  var TEXT_FIELDS = ['page_name', 'canonical_url', 'title', 'meta_description', 'meta_keywords',
    'og_title', 'og_description', 'og_image_url', 'twitter_title', 'twitter_description', 'twitter_image_url'];
  var BOOL_FIELDS = ['robots_index', 'robots_follow'];
  var IMAGE_FIELDS = { og_image_url: true, twitter_image_url: true };
  var RECOMMEND = { title: [50, 60], meta_description: [140, 160] };

  var rows = {};            // key → saved row (or undefined)
  var current = null;       // selected page descriptor
  var pickerTarget = null;  // input id awaiting a media pick

  var $ = function (id) { return document.getElementById(id); };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function toast(kind, message) {
    $('seo-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + kind + '" role="' +
      (kind === 'danger' ? 'alert' : 'status') + '">' + esc(message) + '</div>';
  }

  /* Registry pages, with duplicate keys refused defensively — the DB
     primary key + upsert-by-key make duplicates impossible to store. */
  function pages() {
    var seen = {};
    return (window.NGD_SEO_PAGES || []).filter(function (p) {
      if (seen[p.key]) {
        console.error('[NGD SEO] duplicate page key in the registry ignored: ' + p.key);
        return false;
      }
      seen[p.key] = true;
      return true;
    });
  }

  function absoluteHttpUrl(value) {
    try {
      var parsed = new URL(value); // no base — must already be absolute
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) { return false; }
  }
  function validImageUrl(value) {
    if (!value) return true;
    try {
      var parsed = new URL(value, location.href); // relative allowed for images
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) { return false; }
  }

  /* ---- overview table ---- */
  function effectiveFor(page, row) {
    return {
      title: (row && row.title ? row.title : page.builtin.title) || '',
      description: (row && row.meta_description ? row.meta_description : page.builtin.description) || ''
    };
  }

  function lengthBadge(length, range) {
    var ok = length >= range[0] && length <= range[1];
    return '<span class="ngd-char-badge' + (ok ? ' is-ok' : ' is-warn') + '">' + length + ' ch</span>';
  }

  function renderList() {
    $('seo-list').innerHTML = pages().map(function (page) {
      var row = rows[page.key];
      var eff = effectiveFor(page, row);
      var status = !row ? '<span class="ngd-text-muted small">Built-in</span>'
        : row.active ? '<span class="ngd-status-chip is-good">Live</span>'
          : '<span class="ngd-status-chip">Inactive</span>';
      var indexing = (row ? row.robots_index !== false : true)
        ? '<span class="ngd-status-chip is-good">Index</span>'
        : '<span class="ngd-status-chip is-bad">Noindex</span>';
      return '<tr' + (current && current.key === page.key ? ' class="is-active"' : '') + '>' +
        '<th scope="row"><strong>' + esc(page.label) + '</strong>' +
        '<span class="d-block small ngd-text-muted fw-normal">' + esc(page.path) + '</span></th>' +
        '<td>' + status + '</td>' +
        '<td>' + indexing + '</td>' +
        '<td>' + lengthBadge(eff.title.length, RECOMMEND.title) + '</td>' +
        '<td>' + lengthBadge(eff.description.length, RECOMMEND.meta_description) + '</td>' +
        '<td class="text-end"><button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-seo-open="' +
        esc(page.key) + '">Edit</button></td></tr>';
    }).join('');
    document.querySelectorAll('[data-seo-open]').forEach(function (button) {
      button.onclick = function () { open(button.getAttribute('data-seo-open')); };
    });
  }

  /* ---- editor ---- */
  function fillForm(page) {
    var row = rows[page.key] || {};
    TEXT_FIELDS.forEach(function (field) {
      var input = $('seo-f-' + field);
      if (input) input.value = row[field] || '';
    });
    /* unsaved pages start from their real built-in tags */
    if (!rows[page.key]) {
      $('seo-f-page_name').value = page.label;
      $('seo-f-title').value = page.builtin.title;
      $('seo-f-meta_description').value = page.builtin.description;
    }
    BOOL_FIELDS.forEach(function (field) {
      $('seo-f-' + field).checked = row[field] !== false;
    });
    $('seo-active').checked = row.active !== false; // missing row edits start active
    $('seo-form-updated').textContent = row.updated_at
      ? 'Saved ' + new Date(row.updated_at).toLocaleString()
      : 'Not saved yet — the page uses the SEO built into its HTML';
    refreshPreviews();
  }

  function truncate(value, max) {
    return value.length > max ? value.slice(0, max - 1) + '…' : value;
  }

  function refreshPreviews() {
    if (!current) return;
    var title = $('seo-f-title').value.trim();
    var description = $('seo-f-meta_description').value.trim();
    var canonical = $('seo-f-canonical_url').value.trim();

    /* character guidance — warning only, saving is never blocked on length */
    Object.keys(RECOMMEND).forEach(function (field) {
      var n = $('seo-f-' + field).value.trim().length;
      var range = RECOMMEND[field];
      var count = $('seo-count-' + field);
      count.textContent = n + ' ch · aim for ' + range[0] + '–' + range[1];
      count.classList.toggle('is-warn', n > 0 && (n < range[0] || n > range[1]));
      count.classList.toggle('is-ok', n >= range[0] && n <= range[1]);
    });

    /* SERP preview */
    var host = 'your-domain.com';
    var path = current.path;
    if (canonical && absoluteHttpUrl(canonical)) {
      var parsed = new URL(canonical);
      host = parsed.host;
      path = parsed.pathname.replace(/^\//, '') || path;
    }
    $('seo-serp-url').textContent = host + ' › ' + path;
    $('seo-serp-title').textContent = truncate(title || current.builtin.title, 60);
    $('seo-serp-desc').textContent = truncate(description || current.builtin.description, 160);

    /* social share preview — same fallback chain the public loader uses */
    var ogTitle = $('seo-f-og_title').value.trim() || title || current.builtin.title;
    var ogDescription = $('seo-f-og_description').value.trim() || description || current.builtin.description;
    var ogImage = $('seo-f-og_image_url').value.trim();
    $('seo-og-domain').textContent = host.toUpperCase();
    $('seo-og-title').textContent = truncate(ogTitle, 70);
    $('seo-og-desc').textContent = truncate(ogDescription, 120);
    var img = $('seo-og-img');
    var okImage = ogImage && validImageUrl(ogImage);
    img.hidden = !okImage;
    $('seo-og-noimg').hidden = !!okImage;
    if (okImage) img.src = ogImage; else img.removeAttribute('src');

    /* inline previews under the image inputs */
    Object.keys(IMAGE_FIELDS).forEach(function (field) {
      var value = $('seo-f-' + field).value.trim();
      var preview = $('seo-f-' + field + '-preview');
      if (value && validImageUrl(value)) {
        preview.src = value;
        preview.hidden = false;
      } else {
        preview.hidden = true;
        preview.removeAttribute('src');
      }
    });
  }

  function open(key) {
    current = pages().filter(function (p) { return p.key === key; })[0] || null;
    if (!current) return;
    $('seo-editor-empty').hidden = true;
    $('seo-form').hidden = false;
    $('seo-form-title').textContent = current.label;
    $('seo-form-hint').textContent = current.path +
      (current.dynamic ? ' — without a saved record this page generates SEO from the open product' : '');
    var schemaNames = (current.schemas || []).map(function (name) {
      return (window.NGD_SEO_SCHEMA_LABELS || {})[name] || name;
    });
    $('seo-form-schemas').textContent = schemaNames.length
      ? 'Structured data emitted automatically: ' + schemaNames.join(', ') +
        ' — generated from safe site and product values, no raw code is ever stored.'
      : '';
    fillForm(current);
    renderList();
  }

  function save(event) {
    event.preventDefault();
    if (!current) return;

    var value = function (field) { return $('seo-f-' + field).value.trim(); };
    /* hard errors — real problems only */
    if (!value('title')) return toast('danger', 'The SEO title is required.');
    if (!value('meta_description')) return toast('danger', 'The meta description is required.');
    if (value('canonical_url') && !absoluteHttpUrl(value('canonical_url'))) {
      return toast('danger', 'The canonical URL must be a full absolute address, e.g. https://your-domain.com/' + current.path);
    }
    if (!validImageUrl(value('og_image_url'))) return toast('danger', 'The Open Graph image must be a normal http(s) or relative link.');
    if (!validImageUrl(value('twitter_image_url'))) return toast('danger', 'The Twitter image must be a normal http(s) or relative link.');

    /* soft warnings — recommendations never block a save */
    var warnings = [];
    if (value('title').length < RECOMMEND.title[0] || value('title').length > RECOMMEND.title[1]) {
      warnings.push('the title is outside the recommended 50–60 characters');
    }
    var dl = value('meta_description').length;
    if (dl < RECOMMEND.meta_description[0] || dl > RECOMMEND.meta_description[1]) {
      warnings.push('the description is outside the recommended 140–160 characters');
    }

    var payload = { key: current.key, active: $('seo-active').checked };
    TEXT_FIELDS.forEach(function (field) { payload[field] = value(field) || null; });
    BOOL_FIELDS.forEach(function (field) { payload[field] = $('seo-f-' + field).checked; });

    var button = $('seo-save');
    button.disabled = true;
    button.textContent = 'Saving…';
    window.ngdSupabase.from('seo_pages')
      .upsert(payload, { onConflict: 'key' }).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        rows[current.key] = res.data;
        fillForm(current);
        renderList();
        toast('success', current.label + ' SEO was saved.' +
          (warnings.length ? ' Heads-up: ' + warnings.join('; ') + '.' : ''));
      })
      .catch(function (error) {
        console.error('[NGD SEO] save failed', error);
        toast('danger', 'The changes could not be saved. Please try again.');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = 'Save changes';
      });
  }

  function cancel() {
    if (!current) return;
    fillForm(current);
    toast('info', 'Unsaved changes were discarded.');
  }

  /* ---- media picker over the site-media library ---- */
  var MEDIA_FOLDERS = ['diamonds', 'jewellery', 'homepage', 'manufacturing', 'education', 'about', 'content', 'general'];
  async function openPicker(targetId) {
    pickerTarget = targetId;
    var panel = $('seo-media-picker');
    panel.hidden = false;
    $('seo-media-grid').innerHTML = '<p class="ngd-text-muted small mb-0">Loading media…</p>';
    try {
      var groups = await Promise.all(MEDIA_FOLDERS.map(function (folder) {
        return window.ngdSupabase.storage.from('site-media')
          .list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
          .then(function (result) {
            if (result.error) throw result.error;
            return (result.data || [])
              .filter(function (row) { return row.name && row.name.indexOf('.') !== -1; })
              .map(function (row) { return folder + '/' + row.name; });
          });
      }));
      var paths = [].concat.apply([], groups);
      if (!paths.length) {
        $('seo-media-grid').innerHTML =
          '<p class="ngd-text-muted small mb-0">The media library is empty — upload images under Admin → Media first.</p>';
        return;
      }
      $('seo-media-grid').innerHTML = paths.map(function (path) {
        var url = window.ngdStorageUrl('site-media', path);
        return '<div class="col-4 col-md-3 col-xl-2"><button type="button" class="ngd-cms-pick" data-seo-choose="' +
          esc(url) + '" title="' + esc(path) + '"><img src="' + esc(url) + '" alt="' + esc(path) + '" loading="lazy"></button></div>';
      }).join('');
      document.querySelectorAll('[data-seo-choose]').forEach(function (button) {
        button.onclick = function () {
          var input = $(pickerTarget);
          if (input) {
            input.value = button.getAttribute('data-seo-choose');
            /* bubbles like a real keystroke so the form-level preview listener sees it */
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          panel.hidden = true;
        };
      });
    } catch (error) {
      console.error('[NGD SEO] media picker failed', error);
      $('seo-media-grid').innerHTML =
        '<p class="ngd-text-muted small mb-0">The media library could not load right now.</p>';
    }
  }

  async function load() {
    var res = await window.ngdSupabase.from('seo_pages').select('*');
    if (res.error) {
      console.error('[NGD SEO] load failed', res.error);
      $('seo-list').innerHTML = '<tr><td colspan="6"><div class="ngd-alert ngd-alert-danger mb-0" role="alert">' +
        'Saved SEO could not load. Refresh to try again.</div></td></tr>';
      return;
    }
    rows = {};
    (res.data || []).forEach(function (row) { rows[row.key] = row; });
    renderList();
  }

  async function init() {
    var auth = await window.NGDAuth.requireAdmin();
    if (!auth) return;
    $('seo-form').addEventListener('submit', save);
    $('seo-cancel').addEventListener('click', cancel);
    $('seo-media-close').addEventListener('click', function () { $('seo-media-picker').hidden = true; });
    $('seo-form').addEventListener('input', refreshPreviews);
    document.querySelectorAll('[data-seo-pick]').forEach(function (button) {
      button.onclick = function () { openPicker(button.getAttribute('data-seo-pick')); };
    });
    await load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
