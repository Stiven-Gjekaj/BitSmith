import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decode, sniff } from "../../lib/image/codecs";
import type { EngineFile } from "../../lib/pipeline/types";
import { cropRaw, run } from "./engine";

const pngBytes = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));

const asFile = (): EngineFile => ({
  name: "gradient.png",
  type: "image/png",
  bytes: pngBytes,
});

const silent = () => {};

/** A picture whose every pixel says where it is, so a copy can be checked. */
function marked(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      data[at] = x;
      data[at + 1] = y;
      data[at + 2] = 0;
      data[at + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("cropRaw", () => {
  it("returns the size that was asked for", () => {
    const out = cropRaw(marked(20, 10), 4, 2, 8, 5);
    expect(out.width).toBe(8);
    expect(out.height).toBe(5);
  });

  it("takes the pixels from the right place", () => {
    const out = cropRaw(marked(20, 10), 4, 2, 8, 5);
    // The first pixel of the crop must be the pixel at (4, 2) of the source,
    // and that pixel carries its own coordinates in the red and green
    // channels. This is what proves the offset arithmetic, not the size.
    expect(out.data[0]).toBe(4);
    expect(out.data[1]).toBe(2);

    // The pixel one row down and one across must be (5, 3).
    const second = (1 * out.width + 1) * 4;
    expect(out.data[second]).toBe(5);
    expect(out.data[second + 1]).toBe(3);
  });

  it("stops at the edge instead of reading past the buffer", () => {
    const out = cropRaw(marked(20, 10), 18, 8, 100, 100);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(out.data.length).toBe(2 * 2 * 4);
  });

  it("never returns an empty picture", () => {
    const out = cropRaw(marked(20, 10), 500, 500, 10, 10);
    expect(out.width).toBeGreaterThan(0);
    expect(out.height).toBeGreaterThan(0);
  });
});

describe("the crop and resize engine", () => {
  it("crops to the rectangle it is given", async () => {
    const source = await decode(pngBytes);
    expect(source.width).toBe(64);
    expect(source.height).toBe(48);

    const [result] = await run(
      [asFile()],
      {
        crop: { x: 8, y: 4, width: 32, height: 16 },
        format: "png",
        quality: 90,
      },
      silent,
    );

    const image = await decode(result.bytes);
    expect(image.width).toBe(32);
    expect(image.height).toBe(16);
  });

  it("resizes to an exact width and height", async () => {
    const [result] = await run(
      [asFile()],
      { resize: { width: 20, height: 10 }, format: "png", quality: 90 },
      silent,
    );

    const image = await decode(result.bytes);
    expect(image.width).toBe(20);
    expect(image.height).toBe(10);
  });

  it("crops first and then resizes", async () => {
    const [result] = await run(
      [asFile()],
      {
        crop: { x: 0, y: 0, width: 32, height: 32 },
        resize: { width: 8, height: 8 },
        format: "png",
        quality: 90,
      },
      silent,
    );

    const image = await decode(result.bytes);
    expect(image.width).toBe(8);
    expect(image.height).toBe(8);
  });

  it("leaves the size alone when neither option is given", async () => {
    const [result] = await run(
      [asFile()],
      { format: "webp", quality: 80 },
      silent,
    );

    expect(sniff(result.bytes)).toBe("webp");
    const image = await decode(result.bytes);
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
  });

  it("refuses an empty file list", async () => {
    await expect(
      run([], { format: "png", quality: 90 }, silent),
    ).rejects.toThrow(/Choose a picture/);
  });
});
