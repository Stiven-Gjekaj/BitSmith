import { existsSync, readFileSync } from "node:fs";
import * as ort from "onnxruntime-web/wasm";
import { beforeAll, describe, expect, it } from "vitest";
import type { RawImage } from "../../lib/image/codecs";
import { removeBackground } from "./engine";

const MODEL = "public/models/u2netp-fp16.onnx";

/**
 * A picture with an obvious subject: a solid disc on a flat background.
 *
 * The state is built here rather than read from a photograph, so the test says
 * exactly what it gives the model and the assertions below can be specific.
 */
function discOnBackground(width: number, height: number): RawImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const centreX = width / 2;
  const centreY = height / 2;
  const radius = Math.min(width, height) * 0.3;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      const inside = (x - centreX) ** 2 + (y - centreY) ** 2 < radius * radius;
      data[at] = inside ? 220 : 30;
      data[at + 1] = inside ? 40 : 90;
      data[at + 2] = inside ? 40 : 180;
      data[at + 3] = 255;
    }
  }
  return { data, width, height };
}

// The model is a build asset, not a source file. Skip rather than fail if it
// has not been fetched, so a fresh checkout without it still runs the suite.
const hasModel = existsSync(MODEL);

describe.skipIf(!hasModel)("the background remover", () => {
  // The engine takes a session rather than model bytes, so the session can be
  // built once and kept. The test builds one the same way and passes it in.
  let model: ort.InferenceSession;

  beforeAll(async () => {
    ort.env.wasm.numThreads = 1;
    model = await ort.InferenceSession.create(
      new Uint8Array(readFileSync(MODEL)),
      { executionProviders: ["wasm"], graphOptimizationLevel: "all" },
    );
  });

  it("keeps the width and the height of the picture", async () => {
    const image = discOnBackground(96, 64);
    const out = await removeBackground(image, model);

    expect(out.width).toBe(96);
    expect(out.height).toBe(64);
    expect(out.data.length).toBe(96 * 64 * 4);
  });

  it("leaves the colour channels alone and changes only the alpha", async () => {
    const image = discOnBackground(96, 64);
    const before = new Uint8ClampedArray(image.data);
    const out = await removeBackground(image, model);

    for (let index = 0; index < 96 * 64; index += 1) {
      expect(out.data[index * 4]).toBe(before[index * 4]);
      expect(out.data[index * 4 + 1]).toBe(before[index * 4 + 1]);
      expect(out.data[index * 4 + 2]).toBe(before[index * 4 + 2]);
    }
  });

  it("produces a mask that is not flat", async () => {
    // A mask that came out all one value would mean the model output was
    // ignored, and every assertion about size would still pass. This is the
    // check that the model actually did something.
    const image = discOnBackground(96, 64);
    const out = await removeBackground(image, model);

    const alphas = new Set<number>();
    for (let index = 0; index < 96 * 64; index += 1) {
      alphas.add(out.data[index * 4 + 3]);
    }
    expect(alphas.size).toBeGreaterThan(1);
  });

  it("keeps the subject and clears the ground", async () => {
    // This is the test that says the model still works, and the one above is
    // not. An int8 build of this model was tried and it returned a mask that
    // called every pixel foreground. That mask is not flat, because the
    // normalising step stretches whatever noise is left across the full
    // range, so the check above passed it. Only a comparison between the
    // subject and the ground can tell the difference.
    const width = 96;
    const height = 64;
    const out = await removeBackground(discOnBackground(width, height), model);

    const centreX = width / 2;
    const centreY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    let insideTotal = 0;
    let insideCount = 0;
    let outsideTotal = 0;
    let outsideCount = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = out.data[(y * width + x) * 4 + 3];
        const distance = (x - centreX) ** 2 + (y - centreY) ** 2;
        if (distance < (radius * 0.6) ** 2) {
          insideTotal += alpha;
          insideCount += 1;
        } else if (distance > (radius * 1.8) ** 2) {
          outsideTotal += alpha;
          outsideCount += 1;
        }
      }
    }

    const inside = insideTotal / insideCount;
    const outside = outsideTotal / outsideCount;

    expect(insideCount).toBeGreaterThan(20);
    expect(outsideCount).toBeGreaterThan(20);
    // The measured separation is near the full range on a picture this plain.
    // Half of it is a floor that a working model clears easily and a broken
    // one cannot reach at all.
    expect(inside - outside).toBeGreaterThan(128);
  });

  it("reports progress on the way through", async () => {
    const seen: number[] = [];
    await removeBackground(discOnBackground(64, 64), model, (fraction) =>
      seen.push(fraction),
    );

    expect(seen.length).toBeGreaterThan(2);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});
