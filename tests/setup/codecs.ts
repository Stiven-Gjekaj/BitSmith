/**
 * Starts the WebAssembly codecs for a test run in Node.
 *
 * A browser fetches each `.wasm` file over HTTP next to the bundle, and the
 * codecs do that on their own. Node has nothing to fetch from, so every codec
 * reports "fetch failed" until something hands it the compiled module. This
 * file reads each one from disk and does that once for the whole run.
 *
 * This lives in tests/ and not in src/ on purpose. Nothing here may reach the
 * browser bundle, where it would add a file system dependency that cannot
 * work.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** Finds a file inside an installed package, wherever the store put it. */
function inPackage(pkg: string, ...parts: string[]): string {
  const root = dirname(require.resolve(`${pkg}/package.json`));
  return join(root, ...parts);
}

async function compile(path: string): Promise<WebAssembly.Module> {
  return WebAssembly.compile(readFileSync(path));
}

/**
 * Each codec keeps its module in the file that exports it. Importing the
 * subpath and importing the package index reach the same module instance, so
 * initialising through the subpath also arms the index that an engine uses.
 */
const jobs: Array<[string, string, string[]]> = [
  ["@jsquash/png", "encode.js", ["codec", "pkg", "squoosh_png_bg.wasm"]],
  ["@jsquash/png", "decode.js", ["codec", "pkg", "squoosh_png_bg.wasm"]],
  ["@jsquash/jpeg", "encode.js", ["codec", "enc", "mozjpeg_enc.wasm"]],
  ["@jsquash/jpeg", "decode.js", ["codec", "dec", "mozjpeg_dec.wasm"]],
  ["@jsquash/webp", "encode.js", ["codec", "enc", "webp_enc.wasm"]],
  ["@jsquash/webp", "decode.js", ["codec", "dec", "webp_dec.wasm"]],
  ["@jsquash/avif", "encode.js", ["codec", "enc", "avif_enc.wasm"]],
  ["@jsquash/avif", "decode.js", ["codec", "dec", "avif_dec.wasm"]],
];

for (const [pkg, entry, wasmParts] of jobs) {
  const module = await import(`${pkg}/${entry}`);
  await module.init(await compile(inPackage(pkg, ...wasmParts)));
}

const resize = await import("@jsquash/resize");
await resize.initResize(
  await compile(
    inPackage("@jsquash/resize", "lib", "resize", "pkg", "squoosh_resize_bg.wasm"),
  ),
);
