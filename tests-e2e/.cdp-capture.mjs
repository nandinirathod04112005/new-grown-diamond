import { writeFile } from 'node:fs/promises';

const port = Number(process.argv[2] || 9235);
const base = `http://127.0.0.1:${port}`;

async function waitForEndpoint() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await fetch(`${base}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Browser startup is asynchronous; retry below.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Chrome DevTools endpoint did not become ready');
}

const socket = new WebSocket(await waitForEndpoint());
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let callId = 0;
const pending = new Map();
const exceptions = [];
const consoleErrors = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    exceptions.push(message.params?.exceptionDetails?.text || 'Runtime exception');
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    consoleErrors.push(message.params.args?.map((arg) => arg.value || arg.description).join(' '));
  }
});

function call(method, params = {}) {
  const id = ++callId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function settle(milliseconds = 1800) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function evaluate(expression) {
  const result = await call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value;
}

async function capture({ width, height, mobile, offset, output }) {
  await call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await call('Page.navigate', { url: 'http://127.0.0.1:4175/diamonds' });
  await settle(4200);
  const state = await evaluate(`(() => {
    const target = document.getElementById('cvd-codex');
    if (!target) return { found: false };
    window.scrollTo(0, target.offsetTop + ${offset});
    return { found: true, top: target.offsetTop, height: target.offsetHeight };
  })()`);
  await settle(1700);
  const shot = await call('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(output, Buffer.from(shot.data, 'base64'));
  const layout = await evaluate(`(() => {
    const target = document.getElementById('cvd-codex');
    const sticky = target?.firstElementChild;
    return {
      section: sticky?.dataset.section,
      scrollY: Math.round(window.scrollY),
      viewport: [window.innerWidth, window.innerHeight],
      bodyWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  })()`);
  return { output, state, layout };
}

await call('Page.enable');
await call('Runtime.enable');

const results = [];
results.push(await capture({
  width: 1440,
  height: 900,
  mobile: false,
  offset: 1450,
  output: 'D:/claude code vs/ngd/tests-e2e/cvd-gas-1440.png',
}));
results.push(await capture({
  width: 1440,
  height: 900,
  mobile: false,
  offset: 3300,
  output: 'D:/claude code vs/ngd/tests-e2e/cvd-reactor-1440.png',
}));
results.push(await capture({
  width: 360,
  height: 800,
  mobile: true,
  offset: 0,
  output: 'D:/claude code vs/ngd/tests-e2e/cvd-mobile-360.png',
}));

async function auditRoute(path) {
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await call('Page.navigate', { url: `http://127.0.0.1:4175${path}` });
  await settle(900);
  return evaluate(`(() => {
    const controls = [...document.querySelectorAll('input, textarea, select')];
    const buttons = [...document.querySelectorAll('button')];
    const brokenEagerImages = [...document.images]
      .filter((image) => image.loading !== 'lazy' && image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    return {
      path: location.pathname,
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map((node) => node.innerText.trim()),
      main: document.querySelectorAll('main').length,
      overflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
      unlabelledControls: controls.filter((control) => !control.labels?.length && !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')).length,
      namelessButtons: buttons.filter((button) => !button.innerText.trim() && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby')).length,
      brokenEagerImages,
      loadingCover: Boolean(document.querySelector('[role="status"][aria-label="Loading"]')),
      textLength: document.body.innerText.trim().length,
    };
  })()`);
}

const routes = [
  '/', '/diamonds', '/jewellery', '/about', '/education', '/shapes',
  '/why-lab-grown', '/faq', '/contact', '/login', '/register', '/account',
  '/forgot-password', '/reset-password', '/admin',
];
const routeAudit = [];
for (const route of routes) routeAudit.push(await auditRoute(route));

process.stdout.write(`${JSON.stringify({ results, routeAudit, exceptions, consoleErrors }, null, 2)}\n`);
socket.close();
