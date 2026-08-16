/**
 * Finds the one EXIF field that changes what a picture looks like.
 *
 * A camera that is held sideways does not usually turn the pixels. It writes
 * them the way the sensor read them and records the rotation in a tag, and
 * every viewer turns the picture as it draws it. So the file and the
 * photograph disagree on purpose, and a program that reads the pixels and
 * ignores the tag gets a picture lying on its side.
 *
 * Only the orientation is read here. Everything else in an EXIF block is
 * information about the picture; this is the only part that is instructions
 * for drawing it.
 */

/** The orientation tag, in the range the format defines. */
export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TAG_ORIENTATION = 0x0112;

/**
 * Reads the orientation from a JPEG, or null when there is not one.
 *
 * Null is the common answer and is not a fault. A screenshot, a drawing, and
 * anything a program wrote rather than a camera all carry no tag, and they
 * are all already the right way up.
 */
export function readJpegOrientation(bytes: Uint8Array): Orientation | null {
  const app1 = findExifSegment(bytes);
  if (!app1) {
    return null;
  }
  return readOrientationFromTiff(bytes, app1.start, app1.end);
}

/** Walks the segments to the Exif block, stopping where the picture begins. */
function findExifSegment(
  bytes: Uint8Array,
): { start: number; end: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) {
      return null;
    }
    let markerAt = at + 1;
    while (markerAt < bytes.length && bytes[markerAt] === 0xff) {
      markerAt += 1;
    }
    const marker = bytes[markerAt];

    // Start of scan, or end of image. The tag cannot be after this.
    if (marker === 0xda || marker === 0xd9) {
      return null;
    }
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      at = markerAt + 1;
      continue;
    }

    if (markerAt + 2 >= bytes.length) {
      return null;
    }
    const length = (bytes[markerAt + 1] << 8) | bytes[markerAt + 2];
    const end = markerAt + 1 + length;
    if (length < 2 || end > bytes.length) {
      return null;
    }

    if (marker === 0xe1) {
      const head = markerAt + 3;
      const named =
        bytes[head] === 0x45 && // E
        bytes[head + 1] === 0x78 && // x
        bytes[head + 2] === 0x69 && // i
        bytes[head + 3] === 0x66 && // f
        bytes[head + 4] === 0x00;
      // APP1 also carries XMP, which is a different thing that starts with a
      // web address. Only the block that names itself Exif is read.
      if (named) {
        return { start: head + 6, end };
      }
    }

    at = end;
  }
  return null;
}

/**
 * Reads the orientation out of the TIFF block inside an Exif segment.
 *
 * Offsets inside a TIFF are counted from the start of its own header rather
 * than from the start of the file, which is why `base` is carried through
 * instead of using absolute positions.
 */
function readOrientationFromTiff(
  bytes: Uint8Array,
  base: number,
  end: number,
): Orientation | null {
  if (base + 8 > end) {
    return null;
  }

  // "II" is least significant byte first, "MM" is the other way. Both are
  // used in the wild: phones tend to write one and cameras the other.
  const little = bytes[base] === 0x49 && bytes[base + 1] === 0x49;
  const big = bytes[base] === 0x4d && bytes[base + 1] === 0x4d;
  if (!little && !big) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(base + 2, little) !== 42) {
    return null;
  }

  const firstDirectory = base + view.getUint32(base + 4, little);
  if (firstDirectory + 2 > end) {
    return null;
  }

  const count = view.getUint16(firstDirectory, little);
  for (let index = 0; index < count; index += 1) {
    const entry = firstDirectory + 2 + index * 12;
    if (entry + 12 > end) {
      return null;
    }
    if (view.getUint16(entry, little) !== TAG_ORIENTATION) {
      continue;
    }
    // A SHORT sits in the first two bytes of the value field, and the other
    // two are padding rather than part of the number.
    const value = view.getUint16(entry + 8, little);
    return value >= 1 && value <= 8 ? (value as Orientation) : null;
  }

  return null;
}
