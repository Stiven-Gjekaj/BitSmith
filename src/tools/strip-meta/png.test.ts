import { readFileSync } from "node:fs";
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decode } from "../../lib/image/codecs";
import { stripPng } from "./png";

const plain = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));

/**
 * Splices a chunk in after the header chunk, with a real checksum.
 *
 * The fixture carries no metadata, so stripping it would prove nothing. A
 * wrong checksum here would make the test meaningless in the other direction,
 * because the file would be rejected before anything was stripped, so it is
 * computed rather than invented.
 */
function withChunk(name: string, body: string): Uint8Array {
  const payload = new TextEncoder().encode(body);
  const chunk = new Uint8Array(payload.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length);
  for (let at = 0; at < 4; at += 1) {
    chunk[4 + at] = name.charCodeAt(at);
  }
  chunk.set(payload, 8);
  view.setUint32(
    payload.length + 8,
    crc32(Buffer.from(chunk.subarray(4, payload.length + 8))) >>> 0,
  );

  // After the signature and the IHDR chunk, which is always 25 bytes.
  const cut = 8 + 25;
  const out = new Uint8Array(plain.length + chunk.length);
  out.set(plain.subarray(0, cut), 0);
  out.set(chunk, cut);
  out.set(plain.subarray(cut), cut + chunk.length);
  return out;
}

describe("stripPng", () => {
  it("refuses something that is not a PNG", () => {
    expect(() => stripPng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toThrow(
      /not a PNG/,
    );
  });

  it("takes a text chunk out", () => {
    const before = withChunk("tEXt", "Author\0Somebody Real");
    expect(Buffer.from(before).includes("Somebody Real")).toBe(true);

    const { bytes, removed } = stripPng(before);
    expect(Buffer.from(bytes).includes("Somebody Real")).toBe(false);
    expect(removed).toBe(before.length - bytes.length);
  });

  it("takes an Exif chunk out", () => {
    const { bytes } = stripPng(withChunk("eXIf", "GPS 51.5074N 0.1278W"));
    expect(Buffer.from(bytes).includes("GPS 51.5074N")).toBe(false);
  });

  it("takes the modification time out", () => {
    const { bytes, removed } = stripPng(withChunk("tIME", "\0\0\0\0\0\0\0"));
    expect(removed).toBeGreaterThan(0);
    expect(bytes.length).toBeLessThan(plain.length + 19);
  });

  /**
   * The colour profile stays, for the same reason it stays in a JPEG. It says
   * nothing about the person and dropping it changes how the picture looks.
   */
  it("keeps the colour profile", () => {
    const before = withChunk("iCCP", "profile\0 colour data");
    const { bytes, removed } = stripPng(before);
    expect(Buffer.from(bytes).includes("profile")).toBe(true);
    expect(removed).toBe(0);
  });

  /**
   * The assertion this file exists for: the picture is not recompressed.
   */
  it("leaves every pixel exactly as it was", async () => {
    const { bytes } = stripPng(withChunk("tEXt", "Author\0Somebody Real"));
    const before = await decode(plain);
    const after = await decode(bytes);
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect([...after.data]).toEqual([...before.data]);
  });

  it("gives back a file identical to one that never carried the chunk", () => {
    const { bytes } = stripPng(withChunk("tEXt", "Author\0Somebody Real"));
    expect([...bytes]).toEqual([...plain]);
  });

  it("says nothing was removed from a file that carried nothing", () => {
    const { bytes, removed } = stripPng(plain);
    expect(removed).toBe(0);
    expect([...bytes]).toEqual([...plain]);
  });

  it("gives a damaged file back unchanged", () => {
    const broken = withChunk("tEXt", "Author\0Somebody Real");
    // Claim a length far past the end of the file.
    new DataView(broken.buffer).setUint32(8 + 25, 0x7fffffff);
    const { bytes, removed } = stripPng(broken);
    expect(removed).toBe(0);
    expect(bytes.length).toBe(broken.length);
  });
});
