import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULTS, run } from "./engine";

describe("run", () => {
  const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
  const file = (name: string) => ({ name, bytes: png, type: "image/png" });

  it("refuses an empty list", async () => {
    await expect(run([], { ...DEFAULTS }, () => {})).rejects.toThrow(
      /Choose a picture/,
    );
  });

  it("turns the fixture and swaps its size", async () => {
    const [result] = await run(
      [file("holiday.png")],
      {
        turns: 1,
        flipHorizontal: false,
        flipVertical: false,
        format: "png",
        quality: 90,
      },
      () => {},
    );
    expect(result.name).toBe("holiday.png");
    // The fixture is 64 by 48, so a quarter turn must give 48 by 64.
    const { decode } = await import("../../lib/image/codecs");
    const image = await decode(result.bytes);
    expect(image.width).toBe(48);
    expect(image.height).toBe(64);
  });

  it("works through every file it is given, and ends at one", async () => {
    const seen: number[] = [];
    const results = await run(
      [file("a.png"), file("b.png")],
      { ...DEFAULTS },
      (value) => seen.push(value),
    );
    expect(results).toHaveLength(2);
    expect(seen[seen.length - 1]).toBe(1);
    // Progress must never go backwards, which is what a wrong per file share
    // would do.
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});
