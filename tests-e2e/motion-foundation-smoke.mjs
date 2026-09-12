import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[360, 800], [768, 1024], [1440, 900], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:4182/login');
    await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
    const result = await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { StaggerGrid, ImageMaskReveal, SplitTextReveal } = await import('/src/components/motion/MotionPrimitives.jsx');
      const { default: SmoothScrollProvider } = await import('/src/providers/SmoothScrollProvider.jsx');
      const { getLenis } = await import('/src/lib/motion/lenis.js');
      const host = document.createElement('div');
      document.body.append(host);
      const root = ReactDOM.createRoot(host);
      root.render(React.createElement(React.StrictMode, null,
        React.createElement(SmoothScrollProvider, null,
          React.createElement(StaggerGrid, null, 'text child', React.createElement('span', null, 'Product')),
          React.createElement(ImageMaskReveal, null, React.createElement('span', { id: 'mask-test' }, 'Visible media')),
          React.createElement(SplitTextReveal, null, 'Real diamond'))));
      await new Promise(resolve => setTimeout(resolve, 150));
      const output = { text: host.textContent, clip: getComputedStyle(host.querySelector('#mask-test')).clipPath, smooth: Boolean(getLenis()) };
      root.unmount();
      host.remove();
      output.cleaned = !getLenis() && !document.documentElement.classList.contains('no-smooth');
      return output;
    });
    assert.ok(result.text.includes('Real diamond'));
    assert.ok(result.text.includes('text childProduct'));
    assert.ok(['none', 'inset(0px)'].includes(result.clip));
    assert.equal(result.smooth, false);
    assert.equal(result.cleaned, true);
    await page.close();
    console.log(`Passed motion foundation at ${width}x${height}: readable reduced motion, mixed children, StrictMode cleanup.`);
  }
} finally { await browser.close(); }
