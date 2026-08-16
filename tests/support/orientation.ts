import { readFileSync } from "node:fs";

const plain = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));

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
  base: Uint8Array = plain,
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

  const out = new Uint8Array(base.length + segment.length);
  out.set(base.subarray(0, 2), 0);
  out.set(segment, 2);
  out.set(base.subarray(2), 2 + segment.length);
  return out;
}
