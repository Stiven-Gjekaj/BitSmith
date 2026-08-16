/**
 * Decoding and encoding for the image tools.
 *
 * These functions run in Node and in the browser, because the codecs are
 * WebAssembly and touch no browser API. That is what lets an engine test run
 * without a browser.
 */
import * as avif from "@jsquash/avif";
import * as jpeg from "@jsquash/jpeg";
import * as png from "@jsquash/png";
import * as webp from "@jsquash/webp";

export type ImageFormat = "png" | "jpeg" | "webp" | "avif";

/** A plain ImageData, so that Node needs no browser global. */
export interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export const MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

export const EXTENSION: Record<ImageFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
};

/**
 * Names the format from the bytes themselves.
 *
 * The type that a browser reports on a File comes from the operating system
 * and is often wrong or empty, and a file that a visitor renamed lies about
 * itself. The first bytes of a file do not lie, so this reads those.
 */
export function sniff(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) {
    return null;
  }

  // PNG: the 8 byte signature.
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }

  // JPEG: the start of image marker.
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));

  // WebP: "RIFF" then a size then "WEBP".
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    return "webp";
  }

  // AVIF: an ISO base media file whose brand is avif or avis.
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") {
      return "avif";
    }
  }

  return null;
}

export async function decode(bytes: Uint8Array): Promise<RawImage> {
  const format = sniff(bytes);
  if (!format) {
    throw new Error(
      "This file is not a PNG, JPEG, WebP, or AVIF image. Check that you " +
        "picked the right file.",
    );
  }

  // A copy into a plain ArrayBuffer keeps the codecs away from a view that
  // points into a larger buffer, which some of them read past.
  const buffer = bytes.slice().buffer as ArrayBuffer;

  switch (format) {
    case "png":
      return (await png.decode(buffer)) as RawImage;
    case "jpeg":
      return (await jpeg.decode(buffer)) as RawImage;
    case "webp":
      return (await webp.decode(buffer)) as RawImage;
    case "avif":
      return (await avif.decode(buffer)) as RawImage;
  }
}

/**
 * Encodes an image.
 *
 * `quality` runs from 1 to 100 and is ignored by PNG, which is lossless.
 */
export async function encode(
  image: RawImage,
  format: ImageFormat,
  quality = 82,
): Promise<Uint8Array> {
  const input = image as unknown as ImageData;

  switch (format) {
    case "png":
      return new Uint8Array(await png.encode(input));
    case "jpeg":
      return new Uint8Array(await jpeg.encode(input, { quality }));
    case "webp":
      return new Uint8Array(await webp.encode(input, { quality }));
    case "avif":
      // `bitDepth` is stated so that the compiler picks the 8 bit overload.
      // The encoder also declares a 10 and 12 bit one that takes a different
      // pixel type, and it matches that one first.
      //
      // This encoder takes the same 1 to 100 quality as the others. An older
      // version took `cqLevel`, which is the reverse scale, and passing that
      // name here is silently ignored: every picture then comes out at the
      // default quality and the slider does nothing.
      return new Uint8Array(await avif.encode(input, { bitDepth: 8, quality }));
  }
}
