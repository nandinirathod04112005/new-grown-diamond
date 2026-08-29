import { defineConfig, devices } from '@playwright/test';

import { resolveChromium } from './tests-e2e/browser.js';

const executablePath = resolveChromium();

export default defineConfig({
  testDir: './tests-e2e',
  // Visual QA is inherently order-independent; workers are capped because each
  // one drives a WebGL page and they contend for the software rasteriser.
  workers: process.env.CI ? 2 : 2,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests-e2e/report' }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: process.env.NGD_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Software rasterisation: containers have no GPU, and the diamond hero
      // must still be exercised rather than silently skipped.
      args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },

  // The five viewports the design is specified against.
  projects: [
    { name: '320x568',   use: { ...devices['Desktop Chrome'], viewport: { width: 320,  height: 568  } } },
    { name: '375x812',   use: { ...devices['Desktop Chrome'], viewport: { width: 375,  height: 812  }, isMobile: false, hasTouch: true } },
    { name: '768x1024',  use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: '1440x900',  use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900  } } },
    { name: '1920x1080', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],

  // Tests run against the production build — that is what ships, and it is the
  // only place chunking, minification and asset hashing are exercised.
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
