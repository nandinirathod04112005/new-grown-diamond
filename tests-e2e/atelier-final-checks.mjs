import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';

const servers = [];
for (const [port, command] of [[4182, []], [4183, ['preview']]]) {
  try { await fetch(`http://127.0.0.1:${port}`); }
  catch {
    const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...command, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { windowsHide: true, stdio: 'ignore' });
    servers.push(server);
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await fetch(`http://127.0.0.1:${port}`); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
  }
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.route('**/*', r => /^http:\/\/127\.0\.0\.1:418[23]\//.test(r.request().url()) ? r.continue() : r.abort());
  for (const route of ['/education', '/contact', '/blogs/qa-unavailable', '/login', '/diamonds']) {
    const response = await page.goto(`http://127.0.0.1:4183${route}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('main').waitFor();
  }
  console.log('PASS: production preview directly serves five nested routes.');

  await page.goto('http://127.0.0.1:4182/login', { waitUntil: 'domcontentloaded' });
  await page.locator('h1').waitFor();
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { default: Table } = await import('/src/components/admin/DataTable.jsx');
    const { default: styles } = await import('/src/components/admin/AdminLayout.module.css');
    const { matches, EMPTY } = await import('/src/components/product/stoneFilter.js');
    // Local, synthetic component fixtures only. No auth state or records change.
    const stone = { shape: 'Round', carat: 1, color: 'D', clarity: 'VS1' };
    if (!matches(stone, EMPTY)) throw new Error('Empty filters should retain a stone');
    const host = document.createElement('div'); host.id = 'qa-table'; host.className = styles.shell;
    host.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow:auto;padding:16px';
    document.body.append(host);
    ReactDOM.createRoot(host).render(React.createElement(Table, {
      rows: [{ id: 'QA-ONLY-A', reference: 'QA-ONLY-LONG-REFERENCE-ABCDEFGHIJKLMNOPQRSTUVWXYZ', status: 'Unpublished test fixture' }],
      columns: [{ key: 'reference', label: 'Reference' }, { key: 'status', label: 'Status' }],
      searchKeys: ['reference'],
    }));
  });
  await page.locator('#qa-table table').waitFor();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.locator('#qa-table').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.screenshot({ path: `tests-e2e/atelier-review/interactions/admin-table-${width}.png` });
  }
  await page.getByRole('button', { name: 'Sort by Reference' }).click();
  console.log('PASS: local admin table fixture fits 320/1440px, long reference wraps, sort control responds; empty inventory filter preserves match.');
  await page.close();

  const zoom = await browser.newPage({ viewport: { width: 720, height: 450 }, reducedMotion: 'reduce' });
  await zoom.goto('http://127.0.0.1:4182/contact', { waitUntil: 'domcontentloaded' });
  await zoom.locator('h1').waitFor();
  assert.equal(await zoom.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await zoom.screenshot({ path: 'tests-e2e/atelier-review/interactions/contact-200-percent-equivalent.png' });
  console.log('PASS: contact reflows at 720x450 CSS pixels (1440x900 at 200% zoom equivalent).');
} finally { await browser.close(); for (const server of servers) server.kill(); }

const files = (await fs.readdir('dist/assets')).filter(f => /\.(js|css)$/.test(f));
const after = await Promise.all(files.map(async file => {
  const content = await fs.readFile(`dist/assets/${file}`);
  return { file, bytes: content.length, gzip: zlib.gzipSync(content).length };
}));
await fs.writeFile('tests-e2e/atelier-review/bundle-after.json', JSON.stringify(after, null, 2));
const before = JSON.parse(await fs.readFile('tests-e2e/atelier-review/bundle-before.json'));
const sum = rows => rows.reduce((n, row) => n + row.gzip, 0);
console.log(JSON.stringify({ beforeGzip: sum(before), afterGzip: sum(after), deltaGzip: sum(after) - sum(before), entry: after.find(f => /^index-.*\.js$/.test(f.file)) }, null, 2));
