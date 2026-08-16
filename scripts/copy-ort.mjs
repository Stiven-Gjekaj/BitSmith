/**
 * Copies the onnxruntime runtime files into public/ort/.
 *
 * onnxruntime spawns its own worker threads, and it builds the address of the
 * script for those threads from `ort.env.wasm.wasmPaths`. A bundler renames
 * those files and puts a hash in each name, so the address onnxruntime works
 * out does not exist and the thread never starts. Session creation then waits
 * for a thread that is never coming, and nothing fails and nothing finishes.
 *
 * Serving the files under a name of our own choosing is what fixes that.
 *
 * The copies are not committed. They come from node_modules on every build,
 * so they cannot drift from the installed version.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const to = join(process.cwd(), "public", "ort");

mkdirSync(to, { recursive: true });

// The wasm build this project asks for, and the module that starts its
// threads. Both names must survive, so they are copied and not bundled.
const files = ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];

for (const name of files) {
  // Resolve each file through the package exports. The package does not
  // expose its package.json, so the directory cannot be found from that.
  copyFileSync(require.resolve(`onnxruntime-web/${name}`), join(to, name));
}

console.log(`Copied ${files.length} onnxruntime files into public/ort/.`);
