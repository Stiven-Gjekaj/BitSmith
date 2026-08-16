/**
 * Writes the picture fixtures that the engine tests read.
 *
 * Run this by hand when a new fixture is needed:
 *
 *     node scripts/make-fixtures.mjs
 *
 * The result is committed. No test runs this script.
 *
 * AGENTS.md explains why that matters. A test that builds its own expected
 * value cannot fail, so it catches nothing. The fixtures are inputs, they are
 * fixed once, and every test that reads one checks its first bytes before it
 * trusts it.
 *
 * The picture is 64 wide and 48 high on purpose. A square fixture hides a bug
 * that swaps width for height, and this project resizes and crops.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const inPackage = (pkg, ...parts) =>
  join(dirname(require.resolve(`${pkg}/package.json`)), ...parts);

const compile = (path) => WebAssembly.compile(readFileSync(path));

const pngEncode = await import("@jsquash/png/encode.js");
await pngEncode.init(
  await compile(
    inPackage("@jsquash/png", "codec", "pkg", "squoosh_png_bg.wasm"),
  ),
);

const jpegEncode = await import("@jsquash/jpeg/encode.js");
await jpegEncode.init(
  await compile(inPackage("@jsquash/jpeg", "codec", "enc", "mozjpeg_enc.wasm")),
);

const WIDTH = 64;
const HEIGHT = 48;

const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const at = (y * WIDTH + x) * 4;
    data[at] = Math.round((x / (WIDTH - 1)) * 255);
    data[at + 1] = Math.round((y / (HEIGHT - 1)) * 255);
    data[at + 2] = 128;
    data[at + 3] = 255;
  }
}

const image = { data, width: WIDTH, height: HEIGHT };

writeFileSync(
  "tests/fixtures/gradient.png",
  new Uint8Array(await pngEncode.default(image)),
);
writeFileSync(
  "tests/fixtures/gradient.jpg",
  new Uint8Array(await jpegEncode.default(image, { quality: 90 })),
);

console.log(`Wrote two ${WIDTH}x${HEIGHT} fixtures to tests/fixtures/.`);
