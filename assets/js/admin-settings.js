/* ============================================================
   NEW GROWN DIAMOND — admin Settings (LIVE)
   ------------------------------------------------------------
   Edits public.site_settings by stable key (the registry in
   settings-registry.js — never generated row ids). Six tabbed
   sections render from the registry; Save validates, then
   upserts ONLY the keys that actually changed, with a loading
   state, a truthful success/error toast and an Unsaved-changes
   chip + leave-page warning while edits are pending. Logo and
   favicon pick from the site-media library. Empty fields store
   null — public pages then keep their built-in design. Only
   active admins pass the guard, and RLS
   (supabase/site-settings.sql) is the real enforcement.
   ============================================================ */
(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[+]?[0-9()\s\-]{7,20}$/;

  var values = {};          // key → saved value (string | null)
  var loaded = false;
  var dirty = false;
  var pickerTarget = null;

  var $ = function (id) { return document.getElementById(id); };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function toast(kind, message) {
    $('set-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + kind + '" role="' +
      (kind === 'danger' ? 'alert' : 'status') + '">' + esc(message) + '</div>';
  }
  function sections() { return window.NGD_SETTINGS_SECTIONS || []; }
  function allFields() {
    return sections().reduce(function (list, section) {
      return list.concat(section.fields.map(function (field) {
        return Object.assign({ section: section.id }, field);
      }));
    }, []);
  }

  function relativeOrHttpUrl(value) {
    try {
      var parsed = new URL(value, location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) { return false; }
  }
  function absoluteHttpUrl(value) {
    try {
      var parsed = new URL(value); // must already be absolute
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_error) { return false; }
  }

  /* ---- render tabs + panels from the registry ---- */
  function fieldHtml(field) {
    var id = 'set-f-' + field.key;
    var hint = field.hint ? '<span class="ngd-text-muted d-block small mt-1">' + esc(field.hint) + '</span>' : '';
    var badge = field.adminOnly ? ' <span class="ngd-badge">Admin-only</span>' : '';
    var star = field.required ? ' <span aria-hidden="true">*</span>' : '';
    if (field.type === 'toggle') {
      return '<div class="col-12 col-md-6"><div class="form-check form-switch">' +
        '<input class="form-check-input" type="checkbox" id="' + id + '" data-set-key="' + esc(field.key) + '">' +
        '<label class="form-check-label" for="' + id + '">' + esc(field.label) + hint + '</label></div></div>';
    }
    if (field.type === 'textarea') {
      return '<div class="col-12"><label class="form-label" for="' + id + '">' + esc(field.label) + star + badge + '</label>' +
        '<textarea class="form-control" id="' + id + '" data-set-key="' + esc(field.key) + '" rows="3" maxlength="2000"></textarea>' + hint + '</div>';
    }
    var picker = field.media
      ? '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm text-nowrap" data-set-pick="' + id + '">Browse media…</button>'
      : '';
    var preview = field.media ? '<img class="ngd-cms-preview mt-2" id="' + id + '-preview" alt="" hidden>' : '';
    return '<div class="col-12 col-md-6"><label class="form-label" for="' + id + '">' + esc(field.label) + star + badge + '</label>' +
      '<div class="d-flex gap-2"><input type="text" class="form-control" id="' + id + '" data-set-key="' + esc(field.key) + '"' +
      (field.placeholder ? ' placeholder="' + esc(field.placeholder) + '"' : '') + ' maxlength="500"></div>' +
      (picker ? '<div class="mt-2">' + picker + '</div>' : '') + preview + hint + '</div>';
  }

  function render() {
    $('set-tabs').innerHTML = sections().map(function (section, index) {
      return '<button type="button" class="ngd-settings-tab' + (index === 0 ? ' is-active' : '') +
        '" data-set-tab="' + esc(section.id) + '" role="tab" aria-selected="' + (index === 0 ? 'true' : 'false') + '">' +
        esc(section.label) + '</button>';
    }).join('');
    $('set-panels').innerHTML = sections().map(function (section, index) {
      return '<div class="row g-3" data-set-panel="' + esc(section.id) + '" role="tabpanel"' +
        (index === 0 ? '' : ' hidden') + '>' + section.fields.map(fieldHtml).join('') + '</div>';
    }).join('');
    document.querySelectorAll('[data-set-tab]').forEach(function (button) {
      button.onclick = function () { showTab(button.getAttribute('data-set-tab')); };
    });
    document.querySelectorAll('[data-set-pick]').forEach(function (button) {
      button.onclick = function () { openPicker(button.getAttribute('data-set-pick')); };
    });
  }

  function showTab(id) {
    document.querySelectorAll('[data-set-tab]').forEach(function (button) {
      var on = button.getAttribute('data-set-tab') === id;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('[data-set-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-set-panel') !== id;
    });
  }

  /* ---- values ↔ form ---- */
  function storedString(field) {
    var stored = values[field.key];
    if (field.type === 'toggle') {
      return stored != null ? String(stored) : (field.defaultOn ? 'true' : 'false');
    }
    return stored == null ? '' : String(stored);
  }
  function currentString(field) {
    var input = $('set-f-' + field.key);
    if (!input) return '';
    if (field.type === 'toggle') return input.checked ? 'true' : 'false';
    return input.value.trim();
  }

  function fill() {
    allFields().forEach(function (field) {
      var input = $('set-f-' + field.key);
      if (!input) return;
      if (field.type === 'toggle') input.checked = storedString(field) === 'true';
      else input.value = storedString(field);
    });
    refreshPreviews();
    updateDirty();
  }

  function refreshPreviews() {
    allFields().filter(function (f) { return f.media; }).forEach(function (field) {
      var input = $('set-f-' + field.key);
      var preview = $('set-f-' + field.key + '-preview');
      if (!input || !preview) return;
      var value = input.value.trim();
      if (value && relativeOrHttpUrl(value)) {
        preview.src = value;
        preview.hidden = false;
      } else {
        preview.hidden = true;
        preview.removeAttribute('src');
      }
    });
  }

  function updateDirty() {
    dirty = loaded && allFields().some(function (field) {
      return currentString(field) !== storedString(field);
    });
    $('set-dirty').hidden = !dirty;
  }

  /* Warn before leaving with unsaved edits (requirement: never lose work silently). */
  window.addEventListener('beforeunload', function (event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  /* ---- validation: honest errors only ---- */
  function validate() {
    var fields = allFields();
    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i];
      if (field.type === 'toggle') continue;
      var value = currentString(field);
      var problem = '';
      if (field.required && !value) problem = field.label + ' is required.';
      else if (value && field.type === 'email' && !EMAIL_RE.test(value)) problem = field.label + ' must be a valid email address.';
      else if (value && field.type === 'tel' && !PHONE_RE.test(value)) problem = field.label + ' must be a valid phone number (digits, +, spaces).';
      else if (value && field.type === 'url') {
        var social = field.key.indexOf('social_') === 0;
        if (social ? !absoluteHttpUrl(value) : !relativeOrHttpUrl(value)) {
          problem = field.label + (social
            ? ' must be a full https:// profile address.'
            : ' must be a normal http(s) or relative link.');
        }
      }
      if (problem) {
        showTab(field.section);
        var input = $('set-f-' + field.key);
        if (input) input.focus();
        toast('danger', problem);
        return false;
      }
    }
    return true;
  }

  /* ---- save only what changed ---- */
  function save(event) {
    event.preventDefault();
    if (!validate()) return;
    var changed = allFields().filter(function (field) {
      return currentString(field) !== storedString(field);
    });
    if (!changed.length) {
      toast('info', 'Nothing to save — no setting was changed.');
      return;
    }
    var rows = changed.map(function (field) {
      var value = currentString(field);
      return { key: field.key, value: field.type === 'toggle' ? value : (value || null) };
    });
    var button = $('set-save');
    button.disabled = true;
    button.textContent = 'Saving…';
    window.ngdSupabase.from('site_settings')
      .upsert(rows, { onConflict: 'key' }).select()
      .then(function (res) {
        if (res.error) throw res.error;
        rows.forEach(function (row) { values[row.key] = row.value; });
        updateDirty();
        $('set-status').textContent = 'Saved just now.';
        toast('success', changed.length + (changed.length === 1 ? ' setting was saved.' : ' settings were saved.'));
      })
      .catch(function (error) {
        console.error('[NGD Settings] save failed', error);
        toast('danger', 'The changes could not be saved. Please try again.');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = 'Save changes';
      });
  }

  /* ---- media picker over the site-media library ---- */
  var MEDIA_FOLDERS = ['diamonds', 'jewellery', 'homepage', 'manufacturing', 'education', 'about', 'content', 'general'];
  async function openPicker(targetId) {
    pickerTarget = targetId;
    var panel = $('set-media-picker');
    panel.hidden = false;
    $('set-media-grid').innerHTML = '<p class="ngd-text-muted small mb-0">Loading media…</p>';
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
        $('set-media-grid').innerHTML =
          '<p class="ngd-text-muted small mb-0">The media library is empty — upload images under Admin → Media first.</p>';
        return;
      }
      $('set-media-grid').innerHTML = paths.map(function (path) {
        var url = window.ngdStorageUrl('site-media', path);
        return '<div class="col-4 col-md-3 col-xl-2"><button type="button" class="ngd-cms-pick" data-set-choose="' +
          esc(url) + '" title="' + esc(path) + '"><img src="' + esc(url) + '" alt="' + esc(path) + '" loading="lazy"></button></div>';
      }).join('');
      document.querySelectorAll('[data-set-choose]').forEach(function (button) {
        button.onclick = function () {
          var input = $(pickerTarget);
          if (input) {
            input.value = button.getAttribute('data-set-choose');
            /* bubbles like a real keystroke so the form-level listeners see it */
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          panel.hidden = true;
        };
      });
    } catch (error) {
      console.error('[NGD Settings] media picker failed', error);
      $('set-media-grid').innerHTML =
        '<p class="ngd-text-muted small mb-0">The media library could not load right now.</p>';
    }
  }

  async function load() {
    var res = await window.ngdSupabase.from('site_settings').select('key,value,updated_at');
    if (res.error) {
      console.error('[NGD Settings] load failed', res.error);
      $('set-status').textContent = '';
      toast('danger', 'Saved settings could not load. Refresh to try again.');
      return;
    }
    values = {};
    var latest = '';
    (res.data || []).forEach(function (row) {
      values[row.key] = row.value;
      if (row.updated_at && row.updated_at > latest) latest = row.updated_at;
    });
    loaded = true;
    fill();
    $('set-status').textContent = (res.data || []).length
      ? 'Last saved ' + new Date(latest).toLocaleString()
      : 'No saved settings yet — the site uses its built-in design.';
  }

  async function init() {
    var auth = await window.NGDAuth.requireAdmin();
    if (!auth) return;
    render();
    $('set-form').addEventListener('submit', save);
    $('set-form').addEventListener('input', function () { updateDirty(); refreshPreviews(); });
    $('set-form').addEventListener('change', updateDirty);
    $('set-media-close').addEventListener('click', function () { $('set-media-picker').hidden = true; });
    await load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
