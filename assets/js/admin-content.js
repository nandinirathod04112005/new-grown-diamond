/* ============================================================
   NEW GROWN DIAMOND — admin Content Manager (LIVE)
   ------------------------------------------------------------
   Edits public.site_content by stable section key (the registry
   in content-registry.js). Saving upserts the row; Cancel
   restores the last saved values; the active switch decides
   whether public pages apply the copy or keep their built-in
   text. Image fields preview inline and can pick from the
   site-media library. Only active admins pass the guard, and
   RLS (supabase/site-content.sql) is the real enforcement.
   ============================================================ */
(function () {
  'use strict';

  var TEXTAREAS = { body: true };
  var URL_FIELDS = { cta_url: true, cta2_url: true, image_url: true, secondary_image_url: true };
  var rows = {};            // key → saved row (or undefined)
  var current = null;       // selected section descriptor
  var pickerTarget = null;  // input id awaiting a media pick

  var $ = function (id) { return document.getElementById(id); };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function toast(kind, message) {
    $('cnt-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + kind + '" role="' +
      (kind === 'danger' ? 'alert' : 'status') + '">' + esc(message) + '</div>';
  }
  function sections() { return window.NGD_CONTENT_SECTIONS || []; }
  function labels() { return window.NGD_CONTENT_FIELD_LABELS || {}; }
  function validUrl(value) {
    if (!value) return true;
    try {
      var parsed = new URL(value, location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) { return false; }
  }

  function renderList() {
    $('cnt-list').innerHTML = sections().map(function (section) {
      var row = rows[section.key];
      var state = !row ? '<span class="ngd-text-muted small">built-in copy</span>'
        : row.active ? '<span class="ngd-status-chip is-good">Live</span>'
          : '<span class="ngd-status-chip">Inactive</span>';
      return '<button type="button" class="ngd-dash-row text-start w-100 border-0 bg-transparent' +
        (current && current.key === section.key ? ' is-active' : '') + '" data-cnt-open="' + esc(section.key) + '">' +
        '<div class="flex-grow-1 min-w-0"><strong>' + esc(section.label) + '</strong>' +
        '<span class="ngd-text-muted d-block small">' + esc(section.page) + '</span></div>' + state + '</button>';
    }).join('');
    document.querySelectorAll('[data-cnt-open]').forEach(function (button) {
      button.onclick = function () { open(button.getAttribute('data-cnt-open')); };
    });
  }

  function fieldInput(field) {
    var id = 'cnt-f-' + field;
    var label = labels()[field] || field;
    if (TEXTAREAS[field]) {
      return '<div class="col-12"><label class="form-label" for="' + id + '">' + esc(label) + '</label>' +
        '<textarea class="form-control" id="' + id + '" rows="3" maxlength="2000"></textarea></div>';
    }
    var picker = field === 'image_url' || field === 'secondary_image_url'
      ? '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm text-nowrap" data-cnt-pick="' + id + '">Browse media…</button>'
      : '';
    var preview = field === 'image_url' || field === 'secondary_image_url'
      ? '<img class="ngd-cms-preview mt-2" id="' + id + '-preview" alt="" hidden>'
      : '';
    return '<div class="col-12 col-md-6"><label class="form-label" for="' + id + '">' + esc(label) + '</label>' +
      '<div class="d-flex gap-2"><input type="text" class="form-control" id="' + id + '" maxlength="500">' + picker + '</div>' +
      preview + '</div>';
  }

  function fillForm(section) {
    var row = rows[section.key] || {};
    section.fields.forEach(function (field) {
      var input = $('cnt-f-' + field);
      if (input) input.value = row[field] || '';
      refreshPreview(field);
    });
    $('cnt-active').checked = row.active !== false; // missing row edits start active
    $('cnt-form-updated').textContent = row.updated_at
      ? 'Saved ' + new Date(row.updated_at).toLocaleString()
      : 'Not saved yet — the site shows its built-in copy';
  }

  function refreshPreview(field) {
    var input = $('cnt-f-' + field);
    var preview = $('cnt-f-' + field + '-preview');
    if (!input || !preview) return;
    var value = input.value.trim();
    if (value && validUrl(value)) {
      preview.src = value;
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.removeAttribute('src');
    }
  }

  function open(key) {
    current = sections().filter(function (s) { return s.key === key; })[0] || null;
    if (!current) return;
    $('cnt-editor-empty').hidden = true;
    $('cnt-form').hidden = false;
    $('cnt-form-title').textContent = current.label;
    $('cnt-form-hint').textContent = current.hint || '';
    $('cnt-fields').innerHTML = current.fields.map(fieldInput).join('');
    current.fields.forEach(function (field) {
      var input = $('cnt-f-' + field);
      if (input && (field === 'image_url' || field === 'secondary_image_url')) {
        input.addEventListener('input', function () { refreshPreview(field); });
      }
    });
    document.querySelectorAll('[data-cnt-pick]').forEach(function (button) {
      button.onclick = function () { openPicker(button.getAttribute('data-cnt-pick')); };
    });
    fillForm(current);
    renderList();
  }

  async function save(event) {
    event.preventDefault();
    if (!current) return;
    var payload = { key: current.key, active: $('cnt-active').checked };
    for (var i = 0; i < current.fields.length; i += 1) {
      var field = current.fields[i];
      var value = ($('cnt-f-' + field).value || '').trim();
      if (URL_FIELDS[field] && !validUrl(value)) {
        toast('danger', (labels()[field] || field) + ' must be a normal http(s) or relative link.');
        return;
      }
      payload[field] = value || null;
    }
    var button = $('cnt-save');
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      var res = await window.ngdSupabase.from('site_content')
        .upsert(payload, { onConflict: 'key' }).select().single();
      if (res.error) throw res.error;
      rows[current.key] = res.data;
      fillForm(current);
      renderList();
      toast('success', current.label + ' was saved.');
    } catch (error) {
      console.error('[NGD Content] save failed', error);
      toast('danger', 'The changes could not be saved. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Save changes';
    }
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
    var panel = $('cnt-media-picker');
    panel.hidden = false;
    $('cnt-media-grid').innerHTML = '<p class="ngd-text-muted small mb-0">Loading media…</p>';
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
        $('cnt-media-grid').innerHTML =
          '<p class="ngd-text-muted small mb-0">The media library is empty — upload images under Admin → Media first.</p>';
        return;
      }
      $('cnt-media-grid').innerHTML = paths.map(function (path) {
        var url = window.ngdStorageUrl('site-media', path);
        return '<div class="col-4 col-md-3 col-xl-2"><button type="button" class="ngd-cms-pick" data-cnt-choose="' +
          esc(url) + '" title="' + esc(path) + '"><img src="' + esc(url) + '" alt="' + esc(path) + '" loading="lazy"></button></div>';
      }).join('');
      document.querySelectorAll('[data-cnt-choose]').forEach(function (button) {
        button.onclick = function () {
          var input = $(pickerTarget);
          if (input) {
            input.value = button.getAttribute('data-cnt-choose');
            input.dispatchEvent(new Event('input'));
          }
          panel.hidden = true;
        };
      });
    } catch (error) {
      console.error('[NGD Content] media picker failed', error);
      $('cnt-media-grid').innerHTML =
        '<p class="ngd-text-muted small mb-0">The media library could not load right now.</p>';
    }
  }

  async function load() {
    var res = await window.ngdSupabase.from('site_content').select('*');
    if (res.error) {
      console.error('[NGD Content] load failed', res.error);
      $('cnt-list').innerHTML = '<div class="ngd-alert ngd-alert-danger" role="alert">' +
        'Saved content could not load. Refresh to try again.</div>';
      return;
    }
    rows = {};
    (res.data || []).forEach(function (row) { rows[row.key] = row; });
    renderList();
  }

  async function init() {
    var auth = await window.NGDAuth.requireAdmin();
    if (!auth) return;
    $('cnt-form').addEventListener('submit', save);
    $('cnt-cancel').addEventListener('click', cancel);
    $('cnt-media-close').addEventListener('click', function () { $('cnt-media-picker').hidden = true; });
    await load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
