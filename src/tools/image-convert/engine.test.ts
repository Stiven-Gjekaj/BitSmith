import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decode, sniff } from "../../lib/image/codecs";
import type { EngineFile } from "../../lib/pipeline/types";
import { run } from "./engine";

const pngBytes = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
const jpgBytes = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));

const asFile = (name: string, type: string, bytes: Uint8Array): EngineFile => ({
  name,
  type,
  bytes,
});

const silent = () => {};

describe("the image converter", () => {
  it("turns a PNG into a JPEG", async () => {
    // Confirm the input first. A test that starts at JPEG and ends at JPEG
    // proves nothing, and nobody can see that by reading the assertion.
    expect(sniff(pngBytes)).toBe("png");

    const [result] = await run(
      [asFile("holiday.png", "image/png", pngBytes)],
      { format: "jpeg", quality: 80 },
      silent,
    );

    expect(sniff(result.bytes)).toBe("jpeg");
    expect(result.name).toBe("holiday.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("turns a JPEG into a PNG", async () => {
    expect(sniff(jpgBytes)).toBe("jpeg");

    const [result] = await run(
      [asFile("scan.jpg", "image/jpeg", jpgBytes)],
      { format: "png", quality: 80 },
      silent,
    );

    expect(sniff(result.bytes)).toBe("png");
    expect(result.name).toBe("scan.png");
  });

  it("keeps the width and the height", async () => {
    const [result] = await run(
      [asFile("gradient.png", "image/png", pngBytes)],
      { format: "webp", quality: 75 },
      silent,
    );

    const image = await decode(result.bytes);
    // 64 by 48, and not 48 by 64. A square fixture would let a swap through.
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
  });

  it("converts every file it is given", async () => {
    const results = await run(
      [
        asFile("one.png", "image/png", pngBytes),
        asFile("two.jpg", "image/jpeg", jpgBytes),
      ],
      { format: "webp", quality: 75 },
      silent,
    );

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.name)).toEqual([
      "one.webp",
      "two.webp",
    ]);
    for (const result of results) {
      expect(sniff(result.bytes)).toBe("webp");
    }
  });

  it("reports progress that ends at the finish", async () => {
    const seen: number[] = [];
    await run(
      [asFile("gradient.png", "image/png", pngBytes)],
      { format: "png", quality: 90 },
      (fraction) => seen.push(fraction),
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBe(1);
    // Progress must never go backwards, or the bar jumps about.
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it("refuses an empty file list", async () => {
    await expect(
      run([], { format: "png", quality: 90 }, silent),
    ).rejects.toThrow(/at least one picture/);
  });

  it("trusts the bytes over a wrong type on the file", async () => {
    // The operating system reports the type, and it is often wrong. This file
    // claims to be a PNG and holds a JPEG.
    const [result] = await run(
      [asFile("mislabelled.png", "image/png", jpgBytes)],
      { format: "png", quality: 90 },
      silent,
    );

    expect(sniff(result.bytes)).toBe("png");
    const image = await decode(result.bytes);
    expect(image.width).toBe(64);
  });
});
