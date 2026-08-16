import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readJpegOrientation } from "./exif";

const plain = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));
const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));

/**
 * Builds a real Exif segment carrying one orientation entry.
 *
 * Both byte orders are built by the same code, because both turn up in the
 * wild: phones tend to write one and cameras the other, and a reader that
 * handles only the common one fails on half the photographs it is given.
 */
export function withOrientation(
  value: number,
  little = true,
  name = "Exif\0\0",
): Uint8Array {
  const tiff = new Uint8Array(26);
  const view = new DataView(tiff.buffer);
  tiff[0] = little ? 0x49 : 0x4d;
  tiff[1] = little ? 0x49 : 0x4d;
  view.setUint16(2, 42, little);
  view.setUint32(4, 8, little);
  view.setUint16(8, 1, little);
  view.setUint16(10, 0x0112, little);
  view.setUint16(12, 3, little);
  view.setUint32(14, 1, little);
  view.setUint16(18, value, little);
  view.setUint32(22, 0, little);

  const marker = new TextEncoder().encode(name);
  const payload = new Uint8Array(marker.length + tiff.length);
  payload.set(marker, 0);
  payload.set(tiff, marker.length);

  const segment = new Uint8Array(payload.length + 4);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment[2] = (payload.length + 2) >> 8;
  segment[3] = (payload.length + 2) & 0xff;
  segment.set(payload, 4);

  const out = new Uint8Array(plain.length + segment.length);
  out.set(plain.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(plain.subarray(2), 2 + segment.length);
  return out;
}

describe("readJpegOrientation", () => {
  it("reads a tag written least significant byte first", () => {
    expect(readJpegOrientation(withOrientation(6))).toBe(6);
  });

  it("reads a tag written the other way round", () => {
    expect(readJpegOrientation(withOrientation(6, false))).toBe(6);
  });

  it("reads every value the format defines", () => {
    for (const value of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(readJpegOrientation(withOrientation(value))).toBe(value);
    }
  });

  /**
   * No tag is the common answer and is not a fault. A screenshot or a drawing
   * carries none and is already the right way up.
   */
  it("says nothing for a JPEG that carries no tag", () => {
    expect(readJpegOrientation(plain)).toBeNull();
  });

  it("says nothing for a file that is not a JPEG", () => {
    expect(readJpegOrientation(png)).toBeNull();
  });

  /**
   * APP1 carries two different things. XMP uses the same marker and starts
   * with a web address, and reading it as a TIFF would give nonsense.
   */
  it("ignores an APP1 that is XMP rather than Exif", () => {
    const xmp = withOrientation(6, true, "http://ns.adobe.com/xap/1.0/\0");
    expect(readJpegOrientation(xmp)).toBeNull();
  });

  it("says nothing for a value outside the eight", () => {
    expect(readJpegOrientation(withOrientation(9))).toBeNull();
    expect(readJpegOrientation(withOrientation(0))).toBeNull();
  });

  it("says nothing rather than reading past a damaged block", () => {
    const broken = withOrientation(6);
    // Point the first directory far beyond the end of the segment.
    const tiffAt = 2 + 4 + 6;
    new DataView(broken.buffer).setUint32(tiffAt + 4, 0x7000, true);
    expect(readJpegOrientation(broken)).toBeNull();
  });

  it("does not look for the tag after the picture data starts", () => {
    // A file whose scan begins immediately has nowhere legal to keep a tag.
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]);
    expect(readJpegOrientation(truncated)).toBeNull();
  });
});
