import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withOrientation } from "../../../tests/support/orientation";
import { readJpegOrientation } from "./exif";

const plain = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));
const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));

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
