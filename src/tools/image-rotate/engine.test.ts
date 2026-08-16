import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RawImage } from "../../lib/image/codecs";
import { DEFAULTS, flipRaw, rotateRaw, run } from "./engine";

/**
 * A picture whose four corners are four different colours.
 *
 * Testing a turn against a gradient proves very little, because a gradient
 * looks much the same after most mistakes. Marked corners say exactly where
 * every one of them landed.
 *
 * It is 4 wide and 2 high on purpose. A square hides the bug that keeps the
 * old width, which is the mistake this code is most likely to make.
 */
function marked(): RawImage {
  const width = 4;
  const height = 2;
  const data = new Uint8ClampedArray(width * height * 4);
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    const at = (y * width + x) * 4;
    data[at] = r;
    data[at + 1] = g;
    data[at + 2] = b;
    data[at + 3] = 255;
  };
  // Everything grey, then the four corners named.
  for (let at = 0; at < data.length; at += 4) {
    data[at] = 128;
    data[at + 1] = 128;
    data[at + 2] = 128;
    data[at + 3] = 255;
  }
  put(0, 0, 255, 0, 0); // top left is red
  put(3, 0, 0, 255, 0); // top right is green
  put(0, 1, 0, 0, 255); // bottom left is blue
  put(3, 1, 255, 255, 0); // bottom right is yellow
  return { data, width, height };
}

const at = (image: RawImage, x: number, y: number) => {
  const start = (y * image.width + x) * 4;
  return [...image.data.subarray(start, start + 3)];
};

const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const YELLOW = [255, 255, 0];

describe("rotateRaw", () => {
  it("swaps width and height on a quarter turn", () => {
    const out = rotateRaw(marked(), 1);
    expect(out.width).toBe(2);
    expect(out.height).toBe(4);
  });

  /**
   * Where each corner lands, one quarter turn clockwise. Top left goes to top
   * right, and the rest follow it round.
   */
  it("carries each corner a quarter of the way round, clockwise", () => {
    const out = rotateRaw(marked(), 1);
    expect(at(out, 1, 0)).toEqual(RED);
    expect(at(out, 1, 3)).toEqual(GREEN);
    expect(at(out, 0, 0)).toEqual(BLUE);
    expect(at(out, 0, 3)).toEqual(YELLOW);
  });

  it("puts a half turn opposite", () => {
    const out = rotateRaw(marked(), 2);
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
    expect(at(out, 3, 1)).toEqual(RED);
    expect(at(out, 0, 0)).toEqual(YELLOW);
  });

  /**
   * Four turns is the identity. This catches an error that the single turn
   * test cannot: a consistent mistake that moves every pixel the same wrong
   * way still comes back to itself after four of them only if the mapping is
   * a real rotation.
   */
  it("returns the original after four turns, byte for byte", () => {
    const source = marked();
    const out = rotateRaw(source, 4 as unknown as 0);
    expect(out.width).toBe(source.width);
    expect(out.height).toBe(source.height);
    expect([...out.data]).toEqual([...source.data]);
  });

  it("changes nothing on no turn", () => {
    const source = marked();
    expect([...rotateRaw(source, 0).data]).toEqual([...source.data]);
  });

  it("folds a count outside the four onto the four", () => {
    expect([...rotateRaw(marked(), 5 as unknown as 1).data]).toEqual([
      ...rotateRaw(marked(), 1).data,
    ]);
  });
});

describe("flipRaw", () => {
  it("mirrors left to right, keeping the size", () => {
    const out = flipRaw(marked(), "horizontal");
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
    expect(at(out, 3, 0)).toEqual(RED);
    expect(at(out, 0, 0)).toEqual(GREEN);
    expect(at(out, 3, 1)).toEqual(BLUE);
  });

  it("mirrors top to bottom, keeping the size", () => {
    const out = flipRaw(marked(), "vertical");
    expect(at(out, 0, 1)).toEqual(RED);
    expect(at(out, 0, 0)).toEqual(BLUE);
    expect(at(out, 3, 0)).toEqual(YELLOW);
  });

  it("returns the original when done twice", () => {
    const source = marked();
    const there = flipRaw(source, "horizontal");
    expect([...flipRaw(there, "horizontal").data]).toEqual([...source.data]);
  });
});

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
