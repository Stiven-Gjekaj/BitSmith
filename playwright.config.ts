import { defineConfig, devices } from "@playwright/test";

/**
 * The browser tests.
 *
 * Vitest covers the engines, which are pure and take no browser. Nothing
 * covered the part a visitor touches, and that gap let a broken background
 * remover reach production with a green build: it hung for ever, and every
 * unit test still passed because the engine itself was fine.
 *
 * These tests drive the built site, not the development server, because the
 * built site is what a visitor gets. A worker that a bundler has renamed and a
 * base path that only appears in production are both defects that only the
 * build can show.
 */
export default defineConfig({
  testDir: "tests/e2e",

  // A WebAssembly codec and a 2.3 MB model are slow on a cold run.
  timeout: 90_000,
  expect: { timeout: 20_000 },

  // A flaky pass is worse than a failure, because it teaches people to press
  // the button again. Failing once is the report.
  retries: 0,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: "http://127.0.0.1:4173/bitsmith/",
    trace: "retain-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Most visitors arrive on a phone, so the phone is not an afterthought.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // A plain static server, not `astro preview`. Astro 7 runs preview as a
  // daemon, so the command returns at once and a test runner reads that as a
  // server that died. The script also mimics GitHub Pages more closely, which
  // is a dumb file host under a path prefix.
  webServer: {
    command: "node scripts/serve-dist.mjs 4173",
    url: "http://127.0.0.1:4173/bitsmith/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
