import { defineConfig } from "vitest/config";

// The engines are pure. They take bytes and return bytes, and they touch no
// browser API. That is the whole reason this configuration needs no browser:
// the tests run in Node, against the fixture files in tests/fixtures/.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Node cannot fetch the codec WebAssembly the way a browser does, so this
    // hands each codec its compiled module before any test runs.
    setupFiles: ["tests/setup/codecs.ts"],
    // A WebAssembly codec takes a moment to start on a cold run.
    testTimeout: 30_000,
  },
});
