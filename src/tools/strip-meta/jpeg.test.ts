import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decode } from "../../lib/image/codecs";
import { stripJpeg } from "./jpeg";

const plain = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));

/**
 * Splices a segment into a JPEG, straight after the start of image marker.
 *
 * The fixture carries no metadata, so a test that stripped it would prove
 * nothing. This builds the input the tool exists to handle.
 */
function withSegment(marker: number, body: string): Uint8Array {
  const payload = new TextEncoder().encode(body);
  const length = payload.length + 2;
  const segment = new Uint8Array(payload.length + 4);
  segment[0] = 0xff;
  segment[1] = marker;
  segment[2] = length >> 8;
  segment[3] = length & 0xff;
  segment.set(payload, 4);

  const out = new Uint8Array(plain.length + segment.length);
  out.set(plain.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(plain.subarray(2), 2 + segment.length);
  return out;
}

/** An Exif block, named the way a real one is. */
const withExif = () => withSegment(0xe1, `Exif\0\0GPS 51.5074N 0.1278W`);

describe("stripJpeg", () => {
  it("refuses something that is not a JPEG", () => {
    expect(() => stripJpeg(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a JPEG/);
  });

  it("takes the Exif out", () => {
    const before = withExif();
    expect(Buffer.from(before).includes("GPS 51.5074N")).toBe(true);

    const { bytes } = stripJpeg(before);
    expect(Buffer.from(bytes).includes("GPS 51.5074N")).toBe(false);
    expect(Buffer.from(bytes).includes("Exif")).toBe(false);
  });

  it("gets smaller by what it removed", () => {
    const before = withExif();
    const { bytes, removed } = stripJpeg(before);
    expect(bytes.length).toBeLessThan(before.length);
    expect(before.length - bytes.length).toBe(removed);
  });

  /**
   * The assertion this file exists for.
   *
   * Anything that decoded and encoded the picture would pass every other test
   * here while quietly making the photograph worse. Identical pixels is the
   * only statement that rules that out.
   */
  it("leaves every pixel exactly as it was", async () => {
    const { bytes } = stripJpeg(withExif());
    const before = await decode(plain);
    const after = await decode(bytes);

    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect([...after.data]).toEqual([...before.data]);
  });

  /** Stronger still: the compressed data is not merely equivalent, it is the
   *  same bytes. */
  it("gives back a file identical to one that never had the Exif", () => {
    const { bytes } = stripJpeg(withExif());
    expect([...bytes]).toEqual([...plain]);
  });

  it("takes a comment out as well", () => {
    const { bytes } = stripJpeg(withSegment(0xfe, "written by somebody"));
    expect(Buffer.from(bytes).includes("written by somebody")).toBe(false);
  });

  /**
   * The colour profile stays. Dropping it visibly shifts the colours of a
   * photograph from a modern phone, and it says nothing about the person who
   * took it.
   */
  it("keeps the colour profile", () => {
    const before = withSegment(0xe2, "ICC_PROFILE\0 colour data");
    const { bytes, removed } = stripJpeg(before);
    expect(Buffer.from(bytes).includes("ICC_PROFILE")).toBe(true);
    expect(removed).toBe(0);
  });

  it("keeps the JFIF block", () => {
    const { bytes } = stripJpeg(plain);
    expect(Buffer.from(bytes).includes("JFIF")).toBe(true);
  });

  it("says nothing was removed from a file that carried nothing", () => {
    const { bytes, removed } = stripJpeg(plain);
    expect(removed).toBe(0);
    expect([...bytes]).toEqual([...plain]);
  });

  /**
   * A damaged file must come back untouched rather than half rewritten. The
   * length here claims far more than the file holds.
   */
  it("gives a damaged file back unchanged", () => {
    const broken = withExif();
    const at = 4;
    broken[at] = 0xff;
    broken[at + 1] = 0xff;
    const { bytes, removed } = stripJpeg(broken);
    expect(removed).toBe(0);
    expect(bytes.length).toBe(broken.length);
  });
});
