/**
 * Removes the metadata from a JPEG without touching the picture.
 *
 * The obvious way to do this is to decode the file and encode it again, and
 * it is wrong. Encoding a JPEG throws detail away every time, so a person who
 * asked only to remove the place their photograph was taken would get back a
 * visibly worse picture. This walks the file's own structure instead and
 * copies out everything except the parts being dropped, so the compressed
 * picture data arrives byte for byte identical.
 *
 * A JPEG is a run of segments. Each one starts with 0xFF, then a marker byte,
 * and most then carry a two byte length that counts itself.
 */
import {
  buildOrientationSegment,
  readJpegOrientation,
} from "../../lib/image/exif";

/** Segments carrying no length: start of image, restart marks, and 0x01. */
const STANDALONE = new Set([0xd8, 0x01]);

const isRestart = (marker: number) => marker >= 0xd0 && marker <= 0xd7;

/**
 * What gets dropped, and what is deliberately kept.
 *
 * APP1 is where Exif lives, which is the camera, the time, and the place. The
 * same marker also carries XMP, which is a second copy of much of it. APP13
 * is IPTC, which is captions and credits. Everything from APP3 up is dropped
 * as well, because that range holds vendor blocks that record the device.
 *
 * APP0 stays: it is JFIF, which records how the picture should be scaled.
 *
 * APP2 stays too, and that is a decision rather than an oversight. APP2 is the
 * colour profile. It says nothing about the person or the camera, and dropping
 * it visibly shifts the colours of a photograph from any modern phone. A tool
 * that quietly changed how a picture looks while claiming to remove a location
 * tag would be doing something its name does not say.
 */
const isDropped = (marker: number) =>
  marker === 0xe1 || // APP1: Exif and XMP
  (marker >= 0xe3 && marker <= 0xef) || // APP3 to APP15: vendor blocks, IPTC
  marker === 0xfe; // COM: a free text comment

export interface StripResult {
  bytes: Uint8Array;
  /** How many bytes of metadata went. Zero means there was none to remove. */
  removed: number;
}

export function stripJpeg(input: Uint8Array): StripResult {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) {
    throw new Error("This is not a JPEG.");
  }

  // The one field that is kept out of everything being thrown away.
  //
  // A camera held sideways records the rotation in the Exif block rather than
  // turning the pixels, and every viewer turns the picture as it draws it.
  // Dropping the block along with everything else would leave the photograph
  // lying on its side, which is a visible change to a picture this tool
  // promises not to touch. So the block goes and a 36 byte replacement
  // carrying only the orientation takes its place. The place, the time, the
  // camera and its serial number all still go.
  const orientation = readJpegOrientation(input);

  const pieces: Uint8Array[] = [input.subarray(0, 2)];
  if (orientation !== null && orientation !== 1) {
    pieces.push(buildOrientationSegment(orientation));
  }
  let at = 2;
  let removed = 0;

  while (at < input.length) {
    if (input[at] !== 0xff) {
      // Not on a marker. The file is damaged or is not shaped the way this
      // expects, and guessing from here would corrupt the picture. Give the
      // input back untouched rather than write something broken.
      return { bytes: input, removed: 0 };
    }

    // A run of 0xFF bytes before a marker is legal padding.
    let markerAt = at + 1;
    while (markerAt < input.length && input[markerAt] === 0xff) {
      markerAt += 1;
    }
    if (markerAt >= input.length) {
      return { bytes: input, removed: 0 };
    }
    const marker = input[markerAt];

    if (STANDALONE.has(marker) || isRestart(marker)) {
      pieces.push(input.subarray(at, markerAt + 1));
      at = markerAt + 1;
      continue;
    }

    // Start of scan. Everything after it is the compressed picture, and it is
    // not made of segments: it is entropy coded data in which 0xFF bytes are
    // stuffed with a following zero. Walking it as though it held markers
    // would find markers that are not there and destroy the file. So the rest
    // of the file is copied exactly as it stands, and the walk stops.
    if (marker === 0xda) {
      pieces.push(input.subarray(at, input.length));
      break;
    }

    if (markerAt + 2 >= input.length) {
      return { bytes: input, removed: 0 };
    }
    const length = (input[markerAt + 1] << 8) | input[markerAt + 2];
    const end = markerAt + 1 + length;
    if (length < 2 || end > input.length) {
      return { bytes: input, removed: 0 };
    }

    if (isDropped(marker)) {
      removed += end - at;
    } else {
      pieces.push(input.subarray(at, end));
    }
    at = end;
  }

  let size = 0;
  for (const piece of pieces) {
    size += piece.length;
  }
  const bytes = new Uint8Array(size);
  let written = 0;
  for (const piece of pieces) {
    bytes.set(piece, written);
    written += piece.length;
  }

  // What the visitor is told is the net change, which is what they can see on
  // the file. Counting the removed block while ignoring the replacement would
  // overstate it by 34 bytes.
  return { bytes, removed: Math.max(0, input.length - bytes.length) };
}
