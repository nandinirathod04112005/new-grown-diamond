/* Shared helpers for the NGD browser tests (dev tooling only —
   the site itself is plain HTML/CSS/JS with no Node dependency). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

/** Serve the repository root on an ephemeral localhost port. */
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      } catch (_e) {
        res.writeHead(400);
        return res.end();
      }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.normalize(path.join(ROOT, pathname));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        return res.end();
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end('not found');
        }
        res.writeHead(200, {
          'content-type': MIME[path.extname(file)] || 'application/octet-stream',
        });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        origin: `http://127.0.0.1:${server.address().port}`,
      });
    });
  });
}

/** Launch options that work both locally and in CI containers.
    Override the browser binary with NGD_CHROMIUM=/path/to/chrome. */
function chromiumOptions() {
  if (process.env.NGD_CHROMIUM) {
    return { executablePath: process.env.NGD_CHROMIUM };
  }
  if (fs.existsSync('/opt/pw-browsers/chromium')) {
    return { executablePath: '/opt/pw-browsers/chromium' };
  }
  return {}; // playwright's own downloaded chromium
}

/** Serve the pinned CDN assets from local node_modules and stub the
    font hosts, so tests run fully offline and deterministic. */
async function installCdnRoutes(context) {
  const assets = {
    'bootstrap.min.css': ['bootstrap/dist/css/bootstrap.min.css', 'text/css'],
    'bootstrap.bundle.min.js': ['bootstrap/dist/js/bootstrap.bundle.min.js', 'application/javascript'],
    'supabase.js': ['@supabase/supabase-js/dist/umd/supabase.js', 'application/javascript'],
  };
  /* three's package "exports" blocks require.resolve of arbitrary
     subpaths — resolve its root dir instead and serve files from it. */
  let threeRoot = null;
  try {
    threeRoot = path.join(path.dirname(require.resolve('three')), '..');
  } catch (_e) { /* three not installed — hero tests will fail loudly */ }

  await context.route('https://cdn.jsdelivr.net/**', (route) => {
    const url = route.request().url();
    const threeMatch = url.match(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+?)(\?.*)?$/);
    if (threeMatch && threeRoot) {
      const file = path.join(threeRoot, threeMatch[1]);
      if (file.startsWith(threeRoot) && fs.existsSync(file)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: fs.readFileSync(file, 'utf8'),
        });
      }
      return route.abort();
    }
    for (const [suffix, [spec, type]] of Object.entries(assets)) {
      if (url.endsWith(suffix)) {
        return route.fulfill({
          status: 200,
          contentType: type,
          body: fs.readFileSync(require.resolve(spec), 'utf8'),
        });
      }
    }
    return route.abort();
  });
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '/* fonts stubbed for offline tests */' })
  );
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
}

module.exports = { ROOT, startServer, chromiumOptions, installCdnRoutes };
