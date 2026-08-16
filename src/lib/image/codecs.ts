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

/** A format this project can write. */
export type EncodableFormat = "png" | "jpeg" | "webp" | "avif";

/**
 * A format this project can read. Every format it writes, it can also read.
 *
 * HEIC is the one that goes only one way. An iPhone writes it by default and
 * almost nothing outside Apple opens it, so decoding it is worth a lot;
 * encoding it needs an HEVC encoder that is patent encumbered, and nobody
 * asks for it. Keeping the two directions in separate types is what makes
 * encode(image, "heic") refuse to compile rather than fail at run time.
 */
export type DecodableFormat = EncodableFormat | "heic";

/** A plain ImageData, so that Node needs no browser global. */
export interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export const MIME: Record<DecodableFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
};

export const EXTENSION: Record<DecodableFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
  heic: "heic",
};

/**
 * Names the format from the bytes themselves.
 *
 * The type that a browser reports on a File comes from the operating system
 * and is often wrong or empty, and a file that a visitor renamed lies about
 * itself. The first bytes of a file do not lie, so this reads those.
 */
export function sniff(bytes: Uint8Array): DecodableFormat | null {
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

  // AVIF and HEIC are both ISO base media files, told apart by their brands.
  if (ascii(4, 4) === "ftyp") {
    const brands = readBrands(bytes, ascii);

    // AVIF is checked first, and the order matters. A perfectly ordinary AVIF
    // can carry the major brand "mif1", which is also on the HEIC list, so
    // asking the HEIC question first would name some AVIF files HEIC.
    if (brands.includes("avif") || brands.includes("avis")) {
      return "avif";
    }
    if (HEIC_BRANDS.some((brand) => brands.includes(brand))) {
      return "heic";
    }
  }

  return null;
}

/**
 * Every brand an ISO base media file declares, major and compatible.
 *
 * Reading only the major brand at offset 8 is what this did before, and it
 * missed AVIF files whose major brand is "mif1" with "avif" further down the
 * compatible list. Those files decoded perfectly well and were refused at the
 * door.
 *
 * The box length is read but not trusted: a damaged or hostile file can claim
 * any size, so the walk stops at whichever comes first of the declared
 * length, the real end of the data, and a fixed ceiling.
 */
function readBrands(
  bytes: Uint8Array,
  ascii: (start: number, length: number) => string,
): string[] {
  const declared =
    (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const end = Math.min(declared, bytes.length, 64);

  // Offset 8 is the major brand, 12 is its minor version, and the compatible
  // brands run from 16 to the end of the box, four bytes each.
  const brands = [ascii(8, 4)];
  for (let at = 16; at + 4 <= end; at += 4) {
    brands.push(ascii(at, 4));
  }
  return brands;
}

/**
 * The brands that mean HEIC.
 *
 * "mif1" and "msf1" are generic image and sequence brands rather than HEIC
 * proper, so they are last and they are only reached once AVIF has been ruled
 * out above.
 */
const HEIC_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
];

export async function decode(bytes: Uint8Array): Promise<RawImage> {
  const format = sniff(bytes);
  if (!format) {
    throw new Error(
      "This file is not a PNG, JPEG, WebP, AVIF, or HEIC image. Check that " +
        "you picked the right file.",
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
    case "heic":
      return await decodeHeic(bytes);
  }
}

/**
 * Decodes a HEIC, the format an iPhone writes by default.
 *
 * libheif is imported here rather than at the top of the file, and that is
 * the whole point of the function. The other four codecs are a few tens of
 * kilobytes each; this one is 1.4 MB with its WebAssembly inlined. A static
 * import would hand that to every visitor who opens any image tool, including
 * everyone who never touches a HEIC. Reached from inside the switch, it is
 * downloaded only after sniff() has already seen HEIC brands in the bytes.
 */
async function decodeHeic(bytes: Uint8Array): Promise<RawImage> {
  // The extension is required. The package publishes no exports map, so a
  // bare subpath does not resolve under Node.
  const loaded = await import("libheif-js/wasm-bundle.js");
  const libheif = (loaded as { default?: unknown }).default ?? loaded;

  const decoder = new (
    libheif as { HeifDecoder: new () => HeifDecoder }
  ).HeifDecoder();
  const images = decoder.decode(bytes);

  if (images.length === 0) {
    throw new Error(
      "This HEIC holds no image. It may be a Live Photo video track, or the " +
        "file may be damaged.",
    );
  }

  try {
    // The first image only. A HEIC can hold a burst or a Live Photo, and a
    // visitor converting one expects the picture they saw, not a contact
    // sheet.
    const image = images[0];
    const width = image.get_width();
    const height = image.get_height();
    const out: RawImage = {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    };

    await new Promise<void>((resolve, reject) => {
      image.display(out, (result) => {
        if (result) {
          resolve();
        } else {
          reject(new Error("This HEIC could not be decoded."));
        }
      });
    });

    return out;
  } finally {
    // libheif is compiled with emscripten and its heap does not shrink on its
    // own. Without this, a visitor who converts twenty photographs runs the
    // tab out of memory. The finally matters: a file that fails to decode
    // must free just the same as one that succeeds.
    for (const image of images) {
      image.free();
    }
  }
}

/** Only the parts of the libheif decoder that this file uses. */
interface HeifDecoder {
  decode(bytes: Uint8Array): HeifImage[];
}

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(target: RawImage, done: (result: RawImage | null) => void): void;
  free(): void;
}

/**
 * Encodes an image.
 *
 * `quality` runs from 1 to 100 and is ignored by PNG, which is lossless.
 */
export async function encode(
  image: RawImage,
  format: EncodableFormat,
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
