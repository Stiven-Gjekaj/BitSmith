import type { StripResult } from "./jpeg";

/**
 * Removes the metadata from a PNG without touching the picture.
 *
 * A PNG is a signature followed by chunks. Each chunk is a four byte length,
 * a four byte name, that many bytes, and a four byte checksum of its own.
 *
 * The checksums do not need recomputing, and that is the useful part of the
 * format here: every chunk carries its own, so a chunk that is copied
 * unchanged stays valid whatever happened to its neighbours. Nothing is
 * rewritten, so the image data is identical.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * What gets dropped.
 *
 * The three text chunks hold anything a program chose to write, which in
 * practice is the software name, the author, and sometimes a comment. eXIf is
 * the same Exif block a JPEG carries, so the camera, the time and the place.
 * tIME is when the picture was last changed.
 *
 * iCCP is not here. It is the colour profile, and it stays, for the same
 * reason the JPEG colour profile stays: dropping it changes how the picture
 * looks, and it says nothing about the person.
 */
const DROPPED = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

export function stripPng(input: Uint8Array): StripResult {
  const signed =
    input.length > 8 && SIGNATURE.every((byte, at) => input[at] === byte);
  if (!signed) {
    throw new Error("This is not a PNG.");
  }

  const keep: Array<[number, number]> = [[0, 8]];
  let at = 8;
  let removed = 0;

  while (at + 8 <= input.length) {
    const length =
      (input[at] << 24) |
      (input[at + 1] << 16) |
      (input[at + 2] << 8) |
      input[at + 3];
    const name = String.fromCharCode(...input.subarray(at + 4, at + 8));
    const end = at + 12 + length;

    // A length that runs past the end means the file is damaged. Give it back
    // untouched rather than write half of it.
    if (length < 0 || end > input.length) {
      return { bytes: input, removed: 0 };
    }

    if (DROPPED.has(name)) {
      removed += end - at;
    } else {
      keep.push([at, end]);
    }

    at = end;
    if (name === "IEND") {
      break;
    }
  }

  let size = 0;
  for (const [from, to] of keep) {
    size += to - from;
  }
  const bytes = new Uint8Array(size);
  let written = 0;
  for (const [from, to] of keep) {
    bytes.set(input.subarray(from, to), written);
    written += to - from;
  }

  return { bytes, removed };
}
