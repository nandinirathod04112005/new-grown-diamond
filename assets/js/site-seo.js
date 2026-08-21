/* ============================================================
   NEW GROWN DIAMOND — public SEO loader
   ------------------------------------------------------------
   Applies admin-managed SEO from public.seo_pages onto the
   current page: document.title, meta description/keywords,
   canonical, robots, Open Graph and Twitter tags, plus JSON-LD
   structured data (Organization / WebSite / Breadcrumb /
   Product per the registry in seo-registry.js).

   Precedence, field by field:
     saved ACTIVE row  →  generated from the loaded product
     (detail pages)    →  the SEO built into the page's HTML.
   A missing row, an inactive record or an unreachable Supabase
   leaves the built-in tags exactly as authored — a page never
   loses its SEO. There is only ever ONE effective tag of each
   kind: existing duplicates are pruned before values bind.

   Safety: values land via document.title / setAttribute only
   (never parsed as HTML), URLs must be http(s), and JSON-LD is
   JSON.stringify output with "<" escaped — admin input and
   product data can never execute here.
   ============================================================ */
(function () {
  'use strict';

  var SITE_NAME = 'New Grown Diamond';

  var COLUMNS = 'key,page_name,title,meta_description,meta_keywords,canonical_url,' +
    'robots_index,robots_follow,og_title,og_description,og_image_url,' +
    'twitter_title,twitter_description,twitter_image_url,active';

  function currentPage() {
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return (window.NGD_SEO_PAGES || []).filter(function (p) { return p.path === file; })[0] || null;
  }

  var page = currentPage();
  if (!page) return; // only registered public pages are managed

  /* The page's own head is the ultimate fallback. The title falls back to
     the LIVE document.title (detail pages set honest titles for their
     not-found/error states and those must survive a baseline pass); the
     description is captured once — this loader is its only writer. */
  var builtinDesc = document.querySelector('meta[name="description"]');
  var BUILT_IN = {
    description: builtinDesc ? (builtinDesc.getAttribute('content') || '') : ''
  };

  var row = null;      // active seo_pages record, if any
  var product = null;  // public facts of the loaded product (detail pages)

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }
  function rowText(field) { return row ? text(row[field]) : ''; }
  function caratText(value) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? n.toFixed(2) : '';
  }

  /* Absolute http(s) URL or nothing — javascript:, data: etc. never bind. */
  function absUrl(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      var parsed = new URL(value, location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (_error) { return ''; }
  }

  /* ---- exactly one effective tag of each kind ---- */
  function one(selector, create) {
    var all = document.querySelectorAll(selector);
    for (var i = 1; i < all.length; i += 1) all[i].parentNode.removeChild(all[i]);
    if (all.length) return all[0];
    var el = create();
    document.head.appendChild(el);
    return el;
  }

  function setMeta(kind, name, value) {
    var selector = 'meta[' + kind + '="' + name + '"]';
    if (!value) {
      document.querySelectorAll(selector).forEach(function (el) { el.parentNode.removeChild(el); });
      return;
    }
    one(selector, function () {
      var el = document.createElement('meta');
      el.setAttribute(kind, name);
      return el;
    }).setAttribute('content', value);
  }

  function setCanonical(url) {
    if (!url) return;
    one('link[rel="canonical"]', function () {
      var el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    }).setAttribute('href', url);
  }

  /* ---- product-generated SEO (detail pages, public data only) ---- */
  function productName() {
    if (!product) return '';
    if (product.type === 'diamond') {
      return [
        caratText(product.carat) ? caratText(product.carat) + ' ct' : '',
        text(product.shape),
        'Lab-Grown Diamond'
      ].filter(Boolean).join(' ');
    }
    return text(product.name);
  }

  function productTitle() {
    var name = productName();
    if (!name) return '';
    if (product.type === 'diamond') {
      var grade = [text(product.colour), text(product.clarity)].filter(Boolean).join(' ');
      return name + (grade ? ' · ' + grade : '') + ' — ' + SITE_NAME;
    }
    var category = text(product.category);
    return name + (category ? ' — Lab-Grown Diamond ' + category : '') + ' | ' + SITE_NAME;
  }

  function productDescription() {
    if (!product) return '';
    var out = '';
    if (product.type === 'diamond') {
      var spec = [
        caratText(product.carat) ? caratText(product.carat) + ' carat' : '',
        text(product.colour) ? text(product.colour) + ' colour' : '',
        text(product.clarity) ? text(product.clarity) + ' clarity' : '',
        text(product.cut) ? text(product.cut) + ' cut' : ''
      ].filter(Boolean).join(', ');
      out = (text(product.lab) ? text(product.lab) + '-certified ' : 'Certified ') +
        (text(product.growth) ? text(product.growth) + '-grown ' : 'lab-grown ') +
        (text(product.shape) ? text(product.shape).toLowerCase() + ' ' : '') +
        'diamond' + (spec ? ' — ' + spec : '') + '.' +
        (text(product.publicId) ? ' Reference ' + text(product.publicId) + ' at ' + SITE_NAME + '.' : '');
    } else {
      out = text(product.description);
      if (!out && text(product.name)) {
        out = text(product.name) + ' — a hand-finished lab-grown diamond ' +
          (text(product.category) || 'piece').toLowerCase();
        if (caratText(product.weightCt)) out += ' set with ' + caratText(product.weightCt) + ' ct of certified stones';
        out += ', by ' + SITE_NAME + '.';
      }
    }
    return out.length > 300 ? out.slice(0, 297) + '…' : out;
  }

  /* ---- the one effective value per tag ---- */
  function selfCanonical() {
    var url = location.origin + location.pathname;
    if (page.dynamic) {
      var id = (new URLSearchParams(location.search).get('id') || '').trim();
      if (/^(DIA|JEW)-[A-Z0-9]{8}$/i.test(id)) url += '?id=' + encodeURIComponent(id);
    }
    return url;
  }

  function effective() {
    var title = rowText('title') || productTitle() || document.title;
    var description = rowText('meta_description') || productDescription() || BUILT_IN.description;
    var canonical = absUrl(rowText('canonical_url')) || selfCanonical();
    var ogTitle = rowText('og_title') || title;
    var ogDescription = rowText('og_description') || description;
    var ogImage = absUrl(rowText('og_image_url')) || (product ? absUrl(product.image) : '');
    var twitterImage = absUrl(rowText('twitter_image_url')) || ogImage;
    return {
      title: title,
      description: description,
      keywords: rowText('meta_keywords'),
      robots: row
        ? (row.robots_index === false ? 'noindex' : 'index') + ', ' +
          (row.robots_follow === false ? 'nofollow' : 'follow')
        : '',
      canonical: canonical,
      ogType: product ? 'product' : 'website',
      ogTitle: ogTitle,
      ogDescription: ogDescription,
      ogImage: ogImage,
      twitterCard: (twitterImage || ogImage) ? 'summary_large_image' : 'summary',
      twitterTitle: rowText('twitter_title') || ogTitle,
      twitterDescription: rowText('twitter_description') || ogDescription,
      twitterImage: twitterImage
    };
  }

  /* ---- JSON-LD, generated from safe values only ---- */
  function jsonLdGraph(seo) {
    var homeUrl = new URL('index.html', location.href).href;
    var graph = [];
    var schemas = page.schemas || [];
    if (schemas.indexOf('organization') !== -1) {
      graph.push({ '@type': 'Organization', name: SITE_NAME, url: homeUrl });
    }
    if (schemas.indexOf('website') !== -1) {
      graph.push({ '@type': 'WebSite', name: SITE_NAME, url: homeUrl });
    }
    if (schemas.indexOf('breadcrumb') !== -1) {
      var items = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl },
        { '@type': 'ListItem', position: 2, name: page.label, item: new URL(page.path, location.href).href }
      ];
      if (product && productName()) {
        items.push({ '@type': 'ListItem', position: 3, name: productName(), item: seo.canonical });
      }
      graph.push({ '@type': 'BreadcrumbList', itemListElement: items });
    }
    if (schemas.indexOf('product') !== -1 && product && productName()) {
      var prod = {
        '@type': 'Product',
        name: productName(),
        description: seo.description,
        sku: text(product.publicId),
        brand: { '@type': 'Brand', name: SITE_NAME },
        url: seo.canonical
      };
      if (seo.ogImage) prod.image = seo.ogImage;
      /* no offers/price — pricing stays on request and never enters public markup */
      graph.push(prod);
    }
    return graph;
  }

  function renderJsonLd(seo) {
    var graph = jsonLdGraph(seo);
    var el = document.getElementById('ngd-jsonld');
    if (!graph.length) {
      if (el) el.parentNode.removeChild(el);
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'ngd-jsonld';
      document.head.appendChild(el);
    }
    /* pure JSON with "<" escaped — cannot close the tag, cannot execute */
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
      .replace(/</g, '\\u003c');
  }

  function apply() {
    var seo = effective();
    document.title = seo.title;
    setMeta('name', 'description', seo.description);
    setMeta('name', 'keywords', seo.keywords);
    setMeta('name', 'robots', seo.robots);
    setCanonical(seo.canonical);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:type', seo.ogType);
    setMeta('property', 'og:title', seo.ogTitle);
    setMeta('property', 'og:description', seo.ogDescription);
    setMeta('property', 'og:url', seo.canonical);
    setMeta('property', 'og:image', seo.ogImage);
    setMeta('name', 'twitter:card', seo.twitterCard);
    setMeta('name', 'twitter:title', seo.twitterTitle);
    setMeta('name', 'twitter:description', seo.twitterDescription);
    setMeta('name', 'twitter:image', seo.twitterImage);
    renderJsonLd(seo);
  }

  var readyResolve;
  var ready = new Promise(function (resolve) { readyResolve = resolve; });

  async function init() {
    /* Baseline first: canonical + social tags derived from the built-in
       head, so even an offline page ships a complete, consistent set. */
    apply();
    try {
      if (window.ngdSupabase) {
        var res = await window.ngdSupabase.from('seo_pages')
          .select(COLUMNS).eq('key', page.key).eq('active', true).limit(1);
        if (res.error) throw res.error;
        row = (res.data && res.data[0]) || null;
        if (row) apply();
      }
    } catch (error) {
      /* built-in tags stay — an SEO read must never hurt the page */
      console.warn('[NGD SEO] live SEO unavailable, keeping the built-in tags', error);
    }
    readyResolve();
  }

  window.NGDSeo = {
    /** Detail pages hand over PUBLIC facts of the loaded product.
        Waits for the saved-override lookup so precedence holds. */
    applyProduct: function (info) {
      if (!info || (info.type !== 'diamond' && info.type !== 'jewellery')) return Promise.resolve();
      return ready.then(function () {
        product = info;
        apply();
      });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
