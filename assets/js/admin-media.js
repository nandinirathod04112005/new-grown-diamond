/* ============================================================
   NEW GROWN DIAMOND — admin Media Library (LIVE)
   ------------------------------------------------------------
   General website imagery in the public site-media bucket,
   organised by category folders. Active admins upload, copy
   public URLs and delete; Storage RLS (supabase/site-media.sql)
   is the enforcement layer — customers and guests can only read.
   Product photos are managed on their diamond/jewellery records
   and are never duplicated here.
   ============================================================ */
(function () {
  'use strict';

  var BUCKET = 'site-media';
  var MAX_BYTES = 5 * 1024 * 1024;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  var CATEGORIES = [
    { key: 'diamonds', label: 'Diamonds' },
    { key: 'jewellery', label: 'Jewellery' },
    { key: 'homepage', label: 'Homepage' },
    { key: 'manufacturing', label: 'Manufacturing' },
    { key: 'education', label: 'Education' },
    { key: 'about', label: 'About' },
    { key: 'content', label: 'Blog / Content' },
    { key: 'general', label: 'General' }
  ];

  var items = [];        // {name, folder, size, createdAt, url, path}
  var query = '';
  var category = 'all';

  var $ = function (id) { return document.getElementById(id); };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function labelFor(folder) {
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].key === folder) return CATEGORIES[i].label;
    }
    return folder;
  }
  function toast(kind, message) {
    $('med-toast').innerHTML = '<div class="ngd-alert ngd-alert-' + kind + '" role="' +
      (kind === 'danger' ? 'alert' : 'status') + '">' + esc(message) + '</div>';
  }
  function sizeLabel(bytes) {
    if (!bytes && bytes !== 0) return '—';
    return bytes >= 1024 * 1024
      ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
      : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  function dateLabel(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  /* Readable, URL-safe filename that keeps the original identity. */
  function sanitizeName(name) {
    var dot = name.lastIndexOf('.');
    var base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
    var ext = (dot > 0 ? name.slice(dot + 1) : '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return base + (ext ? '.' + ext : '');
  }

  function visible() {
    var lower = query.toLowerCase();
    return items.filter(function (item) {
      return (category === 'all' || item.folder === category) &&
        (!lower || item.name.toLowerCase().indexOf(lower) !== -1);
    });
  }

  function render() {
    var list = visible();
    $('med-grid').innerHTML = list.map(function (item) {
      return '<div class="col-12 col-sm-6 col-lg-4 col-xxl-3">' +
        '<article class="ngd-card ngd-media-card h-100" data-med-item="' + esc(item.path) + '">' +
        '<div class="ngd-media-thumb"><img src="' + esc(item.url) + '" alt="' + esc(item.name) + '" loading="lazy"></div>' +
        '<div class="ngd-media-body">' +
        '<p class="ngd-media-name" title="' + esc(item.name) + '">' + esc(item.name) + '</p>' +
        '<p class="ngd-media-meta small ngd-text-muted">' + esc(labelFor(item.folder)) + ' · ' +
        esc(sizeLabel(item.size)) + ' · <span data-med-dim>…</span> · ' + esc(dateLabel(item.createdAt)) + '</p>' +
        '<div class="d-flex gap-2">' +
        '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm flex-fill" data-med-copy="' + esc(item.url) + '">Copy URL</button>' +
        '<button type="button" class="ngd-btn ngd-btn-outline ngd-btn-sm" data-med-delete="' + esc(item.path) + '"' +
        ' aria-label="Delete ' + esc(item.name) + '">Delete</button>' +
        '</div></div></article></div>';
    }).join('');

    $('med-count').textContent = items.length
      ? list.length + ' of ' + items.length + ' files'
      : 'No files yet';
    $('med-grid').hidden = !list.length;
    $('med-no-match').hidden = !items.length || !!list.length;
    $('med-stage-empty').hidden = !!items.length;

    /* image dimensions, once each thumbnail has real pixels */
    document.querySelectorAll('#med-grid .ngd-media-thumb img').forEach(function (img) {
      var dim = img.closest('article').querySelector('[data-med-dim]');
      function report() {
        if (dim) dim.textContent = img.naturalWidth && img.naturalHeight
          ? img.naturalWidth + '×' + img.naturalHeight : '—';
      }
      if (img.complete) report(); else img.addEventListener('load', report);
      img.addEventListener('error', function () { if (dim) dim.textContent = '—'; });
    });

    document.querySelectorAll('[data-med-copy]').forEach(function (button) {
      button.onclick = function () { copyUrl(button.getAttribute('data-med-copy'), button); };
    });
    document.querySelectorAll('[data-med-delete]').forEach(function (button) {
      button.onclick = function () { removeFile(button.getAttribute('data-med-delete'), button); };
    });
  }

  async function copyUrl(url, button) {
    var done = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        done = true;
      }
    } catch (_error) { /* fall through to the textarea fallback */ }
    if (!done) {
      var area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { done = document.execCommand('copy'); } catch (_error) { done = false; }
      area.remove();
    }
    if (done) {
      var original = button.textContent;
      button.textContent = 'Copied ✓';
      setTimeout(function () { button.textContent = original; }, 1500);
    } else {
      toast('danger', 'The URL could not be copied automatically — it is: ' + url);
    }
  }

  async function removeFile(path, button) {
    var name = path.split('/').pop();
    if (!window.confirm('Delete "' + name + '" permanently? Any page using this image will lose it.')) return;
    button.disabled = true;
    var result = await window.ngdSupabase.storage.from(BUCKET).remove([path]);
    if (result.error) {
      console.error('[NGD Media] delete failed', result.error);
      button.disabled = false;
      toast('danger', 'The file could not be deleted. Please try again.');
      return;
    }
    items = items.filter(function (item) { return item.path !== path; });
    toast('success', '"' + name + '" was deleted.');
    render();
  }

  function validateFile(file) {
    if (TYPES.indexOf(file.type) === -1) {
      return '"' + file.name + '" is not a supported image (JPG, PNG, WEBP or SVG).';
    }
    if (file.size > MAX_BYTES) {
      return '"' + file.name + '" is ' + sizeLabel(file.size) + ' — the limit is 5 MB.';
    }
    return '';
  }

  async function uploadFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var folder = $('med-upload-category').value;
    var problems = [];
    var uploaded = 0;
    var button = $('med-upload-btn');
    button.disabled = true;
    for (var i = 0; i < files.length; i += 1) {
      var file = files[i];
      button.textContent = 'Uploading ' + (i + 1) + '/' + files.length + '…';
      var invalid = validateFile(file);
      if (invalid) { problems.push(invalid); continue; }
      var path = folder + '/' + sanitizeName(file.name);
      /* upsert:false — never silently overwrite an image a page may use */
      var result = await window.ngdSupabase.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) {
        console.error('[NGD Media] upload failed', result.error);
        var duplicate = result.error.statusCode === '409' || /exists/i.test(String(result.error.message || ''));
        problems.push(duplicate
          ? '"' + file.name + '" already exists in ' + labelFor(folder) + ' — rename the file or delete the existing one first.'
          : '"' + file.name + '" could not be uploaded. Please try again.');
        continue;
      }
      uploaded += 1;
    }
    button.disabled = false;
    button.textContent = 'Upload Images';
    if (uploaded) await load(true);
    if (problems.length) {
      toast(uploaded ? 'warning' : 'danger',
        (uploaded ? uploaded + ' uploaded. ' : '') + problems.join(' '));
    } else {
      toast('success', uploaded + (uploaded === 1 ? ' image' : ' images') + ' uploaded to ' + labelFor(folder) + '.');
    }
  }

  async function load(quiet) {
    if (!quiet) {
      $('med-stage-loading').hidden = false;
      $('med-stage-error').hidden = true;
      $('med-stage-empty').hidden = true;
      $('med-grid').hidden = true;
    }
    try {
      var groups = await Promise.all(CATEGORIES.map(function (cat) {
        return window.ngdSupabase.storage.from(BUCKET)
          .list(cat.key, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })
          .then(function (result) {
            if (result.error) throw result.error;
            return (result.data || [])
              .filter(function (row) { return row.name && row.name.indexOf('.') !== -1; })
              .map(function (row) {
                var path = cat.key + '/' + row.name;
                return {
                  name: row.name,
                  folder: cat.key,
                  size: row.metadata && row.metadata.size,
                  createdAt: row.created_at || row.updated_at || null,
                  path: path,
                  url: window.ngdStorageUrl(BUCKET, path)
                };
              });
          });
      }));
      items = [].concat.apply([], groups).sort(function (a, b) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      $('med-stage-loading').hidden = true;
      $('med-stage-error').hidden = true;
      render();
    } catch (error) {
      console.error('[NGD Media] load failed', error);
      $('med-stage-loading').hidden = true;
      $('med-grid').hidden = true;
      $('med-stage-empty').hidden = true;
      $('med-no-match').hidden = true;
      $('med-stage-error').hidden = false;
      $('med-count').textContent = '—';
    }
  }

  function bindUpload() {
    var input = $('med-file-input');
    $('med-upload-btn').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      uploadFiles(input.files);
      input.value = '';
    });
    var zone = $('med-dropzone');
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach(function (type) {
      zone.addEventListener(type, function (event) {
        event.preventDefault();
        zone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      zone.addEventListener(type, function (event) {
        event.preventDefault();
        zone.classList.remove('is-dragover');
      });
    });
    zone.addEventListener('drop', function (event) {
      uploadFiles(event.dataTransfer && event.dataTransfer.files);
    });
  }

  async function init() {
    var auth = await window.NGDAuth.requireAdmin();
    if (!auth) return;
    CATEGORIES.forEach(function (cat) {
      $('med-category').add(new Option(cat.label, cat.key));
      $('med-upload-category').add(new Option(cat.label, cat.key));
    });
    $('med-search').addEventListener('input', function () { query = this.value; render(); });
    $('med-category').addEventListener('change', function () { category = this.value; render(); });
    $('med-clear').addEventListener('click', function () {
      query = '';
      category = 'all';
      $('med-search').value = '';
      $('med-category').value = 'all';
      render();
    });
    $('med-retry').addEventListener('click', function () { load(); });
    bindUpload();
    await load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
