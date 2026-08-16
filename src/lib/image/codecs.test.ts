import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decode, encode, sniff } from "./codecs";

const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
const jpg = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));

/**
 * Reads the first bytes directly, without calling sniff.
 *
 * A test that used sniff to prove that sniff works would pass whatever sniff
 * did. These checks are the independent statement that the fixtures are what
 * the other tests assume.
 */
describe("the fixtures", () => {
  it("gradient.png really starts with the PNG signature", () => {
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("gradient.jpg really starts with the JPEG marker", () => {
    expect([...jpg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });
});

describe("sniff", () => {
  it("names a PNG", () => {
    expect(sniff(png)).toBe("png");
  });

  it("names a JPEG", () => {
    expect(sniff(jpg)).toBe("jpeg");
  });

  it("gives nothing for bytes that are not a picture", () => {
    expect(
      sniff(new TextEncoder().encode("this is just some text at all")),
    ).toBe(null);
  });

  it("gives nothing for a file too short to identify", () => {
    expect(sniff(new Uint8Array([0x89, 0x50]))).toBe(null);
  });

  it("reads the bytes and not the file name", () => {
    // A visitor renames a JPEG to .png often enough that this matters. The
    // engine never sees the name, which is the point being locked in here.
    expect(sniff(jpg)).toBe("jpeg");
    expect(sniff(png)).toBe("png");
  });
});

describe("decode", () => {
  it("reads the size out of a PNG", async () => {
    const image = await decode(png);
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
    expect(image.data.length).toBe(64 * 48 * 4);
  });

  it("reads the size out of a JPEG", async () => {
    const image = await decode(jpg);
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
  });

  it("refuses a file that is not a picture, and says so plainly", async () => {
    const text = new TextEncoder().encode(
      "Dear reader, this is not a picture.",
    );
    await expect(decode(text)).rejects.toThrow(
      /not a PNG, JPEG, WebP, or AVIF/,
    );
  });
});

describe("encode", () => {
  // Each case asserts a property of the output rather than its bytes. An
  // encoder changes its output between versions, so a byte comparison would
  // fail for a reason that has nothing to do with this project.
  const formats = [
    ["png", [0x89, 0x50, 0x4e, 0x47]],
    ["jpeg", [0xff, 0xd8, 0xff]],
  ] as const;

  for (const [format, signature] of formats) {
    it(`writes a real ${format} that decodes at the same size`, async () => {
      const image = await decode(png);
      const bytes = await encode(image, format, 80);

      expect([...bytes.subarray(0, signature.length)]).toEqual([...signature]);

      const back = await decode(bytes);
      expect(back.width).toBe(64);
      expect(back.height).toBe(48);
    });
  }

  it("writes a WebP that this project can read back", async () => {
    const image = await decode(png);
    const bytes = await encode(image, "webp", 80);
    expect(sniff(bytes)).toBe("webp");

    const back = await decode(bytes);
    expect(back.width).toBe(64);
    expect(back.height).toBe(48);
  });

  it("writes an AVIF that this project can read back", async () => {
    const image = await decode(png);
    const bytes = await encode(image, "avif", 60);
    expect(sniff(bytes)).toBe("avif");

    const back = await decode(bytes);
    expect(back.width).toBe(64);
    expect(back.height).toBe(48);
  });

  it("makes a smaller file at a lower quality", async () => {
    const image = await decode(png);
    const good = await encode(image, "jpeg", 95);
    const poor = await encode(image, "jpeg", 20);
    expect(poor.byteLength).toBeLessThan(good.byteLength);
  });

  it("honours the quality for AVIF as well", async () => {
    // This guards a failure that hides. An older version of the encoder took
    // the option under another name, and passing the wrong name is ignored in
    // silence: every picture comes out at the default quality, the file is
    // valid, the size is right, and the slider does nothing at all. Only a
    // comparison between two qualities can see it.
    const image = await decode(png);
    const good = await encode(image, "avif", 90);
    const poor = await encode(image, "avif", 15);
    expect(poor.byteLength).toBeLessThan(good.byteLength);
  });
});
