import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decode, encode } from "../../lib/image/codecs";
import { stripWebp } from "./webp";

const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));

/** A WebP with transparency, which is what makes the encoder write a VP8X. */
let withAlpha: Uint8Array;
/** A plain lossy WebP, which has no VP8X at all. */
let plain: Uint8Array;

beforeAll(async () => {
  const image = await decode(png);
  for (let at = 3; at < image.data.length; at += 28) {
    image.data[at] = 0;
  }
  withAlpha = await encode(image, "webp", 80);
  plain = await encode(await decode(png), "webp", 80);
});

/** Puts a chunk in after the VP8X, and sets its bit in the flags. */
function withChunk(base: Uint8Array, name: string, body: string, flag: number) {
  const payload = new TextEncoder().encode(body);
  const padded = payload.length + (payload.length % 2);
  const chunk = new Uint8Array(8 + padded);
  for (let i = 0; i < 4; i += 1) {
    chunk[i] = name.charCodeAt(i);
  }
  new DataView(chunk.buffer).setUint32(4, payload.length, true);
  chunk.set(payload, 8);

  // After the twelve byte header and the whole VP8X chunk, which is always 18.
  const cut = 12 + 18;
  const out = new Uint8Array(base.length + chunk.length);
  out.set(base.subarray(0, cut), 0);
  out.set(chunk, cut);
  out.set(base.subarray(cut), cut + chunk.length);
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  // Announce it in the flags, the way a real writer would.
  out[20] |= flag;
  return out;
}

const chunks = (bytes: Uint8Array) => {
  const found: string[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 12;
  while (at + 8 <= bytes.length) {
    const name = String.fromCharCode(...bytes.subarray(at, at + 4));
    const size = view.getUint32(at + 4, true);
    found.push(name);
    at += 8 + size + (size % 2);
  }
  return found;
};

describe("stripWebp", () => {
  it("refuses something that is not a WebP", () => {
    expect(() => stripWebp(png)).toThrow(/not a WebP/);
  });

  it("takes an Exif chunk out", () => {
    const before = withChunk(withAlpha, "EXIF", "GPS 51.5074N 0.1278W", 0x08);
    expect(chunks(before)).toContain("EXIF");

    const { bytes, removed } = stripWebp(before);
    expect(chunks(bytes)).not.toContain("EXIF");
    expect(Buffer.from(bytes).includes("GPS 51.5074N")).toBe(false);
    expect(removed).toBeGreaterThan(0);
  });

  it("takes an XMP chunk out, trailing space and all", () => {
    const before = withChunk(withAlpha, "XMP ", "<x>somebody</x>", 0x04);
    const { bytes } = stripWebp(before);
    expect(chunks(bytes)).not.toContain("XMP ");
  });

  /**
   * The first of the two things this format needs that the others do not.
   *
   * A VP8X chunk announces what the file contains. Leaving the Exif bit set
   * after removing the Exif chunk promises a reader something that is no
   * longer there.
   */
  it("clears the announcement as well as the chunk", () => {
    const before = withChunk(withAlpha, "EXIF", "GPS 51.5074N", 0x08);
    expect(before[20] & 0x08).toBe(0x08);

    const { bytes } = stripWebp(before);
    expect(bytes[20] & 0x08).toBe(0);
  });

  /**
   * And it must clear only that bit. Alpha lives next door, and clearing it
   * by mistake gives a file whose transparency is no longer declared.
   */
  it("leaves the other announcements alone", () => {
    const before = withChunk(withAlpha, "EXIF", "GPS 51.5074N", 0x08);
    const alphaBefore = before[20] & 0x10;
    expect(alphaBefore).toBe(0x10);

    const { bytes } = stripWebp(before);
    expect(bytes[20] & 0x10).toBe(0x10);
  });

  /**
   * The second thing, and the one that makes a reader give up entirely. The
   * size in the RIFF header counts the whole file after itself.
   */
  it("corrects the size in the header", () => {
    const before = withChunk(withAlpha, "EXIF", "GPS 51.5074N", 0x08);
    const { bytes } = stripWebp(before);
    const declared = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).getUint32(4, true);
    expect(declared).toBe(bytes.length - 8);
  });

  /**
   * The assertion that catches a wrong flag bit or a wrong size, whatever the
   * byte level checks above happen to say. libwebp reads the header it is
   * given, and a header that lies about the file is where it stops.
   */
  it("gives back a file that still decodes to the same picture", async () => {
    const before = withChunk(withAlpha, "EXIF", "GPS 51.5074N", 0x08);
    const { bytes } = stripWebp(before);

    const original = await decode(withAlpha);
    const after = await decode(bytes);
    expect(after.width).toBe(original.width);
    expect(after.height).toBe(original.height);
    expect([...after.data]).toEqual([...original.data]);
  });

  it("says nothing was removed from a file that carried nothing", () => {
    const { bytes, removed } = stripWebp(plain);
    expect(removed).toBe(0);
    expect([...bytes]).toEqual([...plain]);
  });

  it("leaves a simple WebP with no VP8X alone", () => {
    expect(chunks(plain)).not.toContain("VP8X");
    const { bytes } = stripWebp(plain);
    expect([...bytes]).toEqual([...plain]);
  });

  it("gives a damaged file back unchanged", () => {
    const broken = withChunk(withAlpha, "EXIF", "GPS 51.5074N", 0x08);
    // Claim a chunk far longer than the file.
    new DataView(broken.buffer).setUint32(12 + 18 + 4, 0x7fffffff, true);
    const { bytes, removed } = stripWebp(broken);
    expect(removed).toBe(0);
    expect(bytes.length).toBe(broken.length);
  });
});
