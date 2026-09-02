import { writeFile } from 'node:fs/promises';

const port = Number(process.argv[2] || 9235);
const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const page = pages.find((entry) => entry.type === 'page');
if (!page?.webSocketDebuggerUrl) throw new Error('No browser page is available');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    exceptions.push(message.params?.exceptionDetails?.text || 'Runtime exception');
  }
});

function call(method, params = {}) {
  const callId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.result?.value;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await call('Page.enable');
await call('Runtime.enable');
await call('Emulation.setDeviceMetricsOverride', {
  width: 360,
  height: 800,
  deviceScaleFactor: 1,
  mobile: true,
});
await call('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});

await call('Page.navigate', { url: 'http://127.0.0.1:4175/' });
await wait(1600);
const menuTarget = await evaluate(`(() => {
  const button = document.querySelector('button[aria-controls="site-menu"]');
  const rect = button?.getBoundingClientRect();
  button?.click();
  return {
    buttonVisible: Boolean(rect && rect.width >= 44 && rect.height >= 44),
    buttonRect: rect ? [Math.round(rect.width), Math.round(rect.height)] : null,
  };
})()`);
await wait(100);
const menuState = await evaluate(`(() => {
  const button = document.querySelector('button[aria-controls="site-menu"]');
  const menu = document.getElementById('site-menu');
  return {
    expanded: button?.getAttribute('aria-expanded'),
    menuHidden: menu?.hidden,
    menuLinks: menu?.querySelectorAll('a').length,
    overflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`);
const mobileHome = { ...menuTarget, ...menuState };
const shot = await call('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile('D:/claude code vs/ngd/tests-e2e/home-mobile-menu-360.png', Buffer.from(shot.data, 'base64'));

await call('Page.navigate', { url: 'http://127.0.0.1:4175/contact' });
await wait(1100);
const contact = await evaluate(`(() => {
  const form = document.querySelector('form');
  form?.requestSubmit();
  return {
    invalidFields: form ? [...form.elements].filter((field) => field.willValidate && !field.validity.valid).length : null,
    labelledControls: form ? [...form.querySelectorAll('input,select,textarea')].every((field) => field.labels?.length) : false,
  };
})()`);
await wait(100);
contact.status = await evaluate(`document.querySelector('[role="status"]')?.textContent.trim()`);

await call('Page.navigate', { url: 'http://127.0.0.1:4175/does-not-exist' });
await wait(1100);
const notFound = await evaluate(`({
  main: document.querySelectorAll('main').length,
  heading: document.querySelector('h1')?.innerText.trim(),
  homeLink: Boolean([...document.querySelectorAll('a')].find((link) => link.getAttribute('href') === '/')),
  overflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
})`);

await call('Page.navigate', { url: 'http://127.0.0.1:4175/diamonds#how-its-made' });
await wait(1200);
const mobileProcess = await evaluate(`(() => {
  const section = document.getElementById('how-its-made');
  const steps = section ? [...section.querySelectorAll('div[data-step]')].filter((step) => step.querySelector('h3')) : [];
  return {
    found: Boolean(section),
    sectionHeight: section ? Math.round(section.getBoundingClientRect().height) : null,
    visibleArticles: steps.filter((step) => {
      const style = getComputedStyle(step);
      return style.display !== 'none' && Number(style.opacity) > 0;
    }).length,
    scrollY: Math.round(window.scrollY),
    overflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`);

async function auditViewport(width, height) {
  await call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 900,
  });
  const reports = [];
  for (const path of ['/', '/diamonds']) {
    await call('Page.navigate', { url: `http://127.0.0.1:4175${path}` });
    await wait(1100);
    reports.push(await evaluate(`({
      path: location.pathname,
      viewport: [window.innerWidth, window.innerHeight],
      main: document.querySelectorAll('main').length,
      h1: document.querySelector('h1')?.innerText.trim().slice(0, 80),
      overflow: document.body.scrollWidth > document.documentElement.clientWidth + 1,
      brokenEagerImages: [...document.images].filter((image) => image.loading !== 'lazy' && image.complete && image.naturalWidth === 0).length,
    })`));
  }
  return reports;
}

const tablet = await auditViewport(768, 1024);
const largeDesktop = await auditViewport(1920, 1080);

process.stdout.write(`${JSON.stringify({
  mobileHome,
  contact,
  notFound,
  mobileProcess,
  tablet,
  largeDesktop,
  exceptions,
}, null, 2)}\n`);
socket.close();
