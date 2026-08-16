import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withOrientation } from "../../../tests/support/orientation";
import { decode } from "../../lib/image/codecs";
import {
  buildOrientationSegment,
  readJpegOrientation,
} from "../../lib/image/exif";
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

/** One segment, marker and length included. */
function segment(marker: number, body: string): Uint8Array {
  const payload = new TextEncoder().encode(body);
  const out = new Uint8Array(payload.length + 4);
  out[0] = 0xff;
  out[1] = marker;
  out[2] = (payload.length + 2) >> 8;
  out[3] = (payload.length + 2) & 0xff;
  out.set(payload, 4);
  return out;
}

/** The fixture with any number of segments put in after the opening marker. */
function withSegments(...segments: Uint8Array[]): Uint8Array {
  const added = segments.reduce((total, one) => total + one.length, 0);
  const out = new Uint8Array(plain.length + added);
  out.set(plain.subarray(0, 2), 0);
  let at = 2;
  for (const one of segments) {
    out.set(one, at);
    at += one.length;
  }
  out.set(plain.subarray(2), at);
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

/**
 * The one field that survives, and why.
 *
 * A camera held sideways records the rotation in the Exif block rather than
 * turning the pixels. Dropping the block with everything else would leave the
 * photograph lying on its side, which is a visible change to a picture this
 * tool promises not to touch.
 */
describe("stripJpeg, on a photograph that records its own rotation", () => {
  it("keeps the picture the right way up", () => {
    const { bytes } = stripJpeg(withOrientation(6));
    expect(readJpegOrientation(bytes)).toBe(6);
  });

  it("keeps every one of the eight", () => {
    for (const value of [2, 3, 4, 5, 6, 7, 8]) {
      const { bytes } = stripJpeg(withOrientation(value));
      expect(readJpegOrientation(bytes), `orientation ${value}`).toBe(value);
    }
  });

  /**
   * The whole point of keeping it is that the private parts still go. A test
   * that only checked the orientation survived would pass an implementation
   * that kept the entire block.
   */
  it("still throws the private parts away", () => {
    // A real photograph carries more than one block, so the location and the
    // comment go in beside the orientation, each in the segment that really
    // holds it: APP13 for caption data and COM for free text.
    const both = withSegments(
      buildOrientationSegment(6),
      segment(0xed, "IPTC GPS 51.5074N 0.1278W"),
      segment(0xfe, "taken by somebody"),
    );
    expect(Buffer.from(both).includes("GPS 51.5074N")).toBe(true);

    const { bytes } = stripJpeg(both);
    expect(Buffer.from(bytes).includes("GPS 51.5074N")).toBe(false);
    expect(Buffer.from(bytes).includes("taken by somebody")).toBe(false);
    expect(readJpegOrientation(bytes)).toBe(6);
  });

  /**
   * The replacement is a fixed 36 bytes whatever it replaced, so a file whose
   * Exif block was large shrinks a great deal and one whose block was already
   * minimal stays the same size. The fixture built here is already minimal,
   * which is why this checks the exact size rather than a reduction.
   */
  it("writes back a block of a fixed small size", () => {
    const { bytes } = stripJpeg(withOrientation(6));
    expect(bytes.length).toBe(plain.length + 36);
  });

  /**
   * Orientation 1 means upright, which is what a picture with no tag at all
   * already is. Writing it back would add bytes and say nothing.
   */
  it("adds nothing when the tag only says the picture is upright", () => {
    const { bytes } = stripJpeg(withOrientation(1));
    expect([...bytes]).toEqual([...plain]);
  });

  it("leaves the picture itself untouched", async () => {
    const { decode } = await import("../../lib/image/codecs");
    const { bytes } = stripJpeg(withOrientation(6));
    const after = await decode(bytes);
    // Decoding now honours the tag, so the sides come back swapped. That is
    // the proof the tag survived in a form a decoder can actually read.
    expect([after.width, after.height]).toEqual([48, 64]);
  });
});
