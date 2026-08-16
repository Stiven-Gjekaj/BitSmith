import type { StripResult } from "./jpeg";

/**
 * Removes the metadata from a WebP without touching the picture.
 *
 * A WebP is a RIFF container: the tag "RIFF", a size, the tag "WEBP", and
 * then a run of chunks. Each chunk is a four letter name, a four byte size
 * that does not count itself, and that many bytes. A chunk of odd size is
 * followed by one zero byte that the size does not mention.
 *
 * Two things have to be done here that PNG and JPEG do not need, and both
 * leave a file that readers reject if they are missed.
 */

/**
 * The bits in the VP8X flags byte.
 *
 * A VP8X chunk announces what the rest of the file contains. Removing a chunk
 * without clearing its bit leaves a file that promises metadata it no longer
 * has, and a strict reader treats that as damage.
 *
 * These were confirmed against a real file rather than recalled. The encoder
 * in this project was asked for a picture with transparency, and the flags
 * byte it wrote was 00010000, which puts alpha at 0x10 and fixes every other
 * position from it.
 */
const FLAG_EXIF = 0x08;
const FLAG_XMP = 0x04;

/** The chunks that hold metadata, and nothing else. */
const DROPPED = new Set(["EXIF", "XMP "]);

export function stripWebp(input: Uint8Array): StripResult {
  const name = (at: number) =>
    String.fromCharCode(input[at], input[at + 1], input[at + 2], input[at + 3]);

  if (input.length < 16 || name(0) !== "RIFF" || name(8) !== "WEBP") {
    throw new Error("This is not a WebP.");
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const pieces: Uint8Array[] = [];
  let at = 12;
  let found = false;

  while (at + 8 <= input.length) {
    const chunk = name(at);
    const size = view.getUint32(at + 4, true);
    // An odd sized chunk carries one padding byte that the size leaves out.
    const end = at + 8 + size + (size % 2);

    if (size < 0 || end > input.length) {
      // Damaged. Give it back rather than write half a file.
      return { bytes: input, removed: 0 };
    }

    if (DROPPED.has(chunk)) {
      found = true;
    } else {
      const piece = input.slice(at, end);
      if (chunk === "VP8X") {
        // The flags byte is the first byte of the chunk's own data.
        piece[8] &= ~(FLAG_EXIF | FLAG_XMP);
      }
      pieces.push(piece);
    }

    at = end;
  }

  if (!found) {
    return { bytes: input, removed: 0 };
  }

  let size = 12;
  for (const piece of pieces) {
    size += piece.length;
  }

  const bytes = new Uint8Array(size);
  bytes.set(input.subarray(0, 12), 0);
  let written = 12;
  for (const piece of pieces) {
    bytes.set(piece, written);
    written += piece.length;
  }

  // The size in the RIFF header counts everything after itself, which is the
  // whole file less the tag and the size field. Leaving the old number there
  // tells a reader the file is longer than it is.
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);

  return { bytes, removed: input.length - bytes.length };
}
