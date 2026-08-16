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

  // Files run in parallel, tests inside a file do not. Running everything at
  // once made two of the PDF tests flaky: a different one failed on each run,
  // because a page was still fetching megabytes of WebAssembly while another
  // test was asserting against it. A flaky test is worse than a failing one,
  // because it teaches people to press the button again.
  fullyParallel: false,

  // One at a time. Each tool page pulls several megabytes of WebAssembly and
  // decodes pictures on the main thread of its own tab. Running two at once
  // left a different test hanging on each run, always one that was merely
  // waiting for work the machine had not got to yet.
  //
  // A flaky suite is worse than a slow one. It teaches people to press the
  // button again, and that is how a real failure gets ignored.
  workers: 1,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: "http://127.0.0.1:4173/BitSmith/",
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
    url: "http://127.0.0.1:4173/BitSmith/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
