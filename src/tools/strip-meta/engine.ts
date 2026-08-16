import { type DecodableFormat, MIME, sniff } from "../../lib/image/codecs";
import type { Engine } from "../../lib/pipeline/types";
import { stripJpeg } from "./jpeg";
import { stripPng } from "./png";
import { stripWebp } from "./webp";

export interface StripOptions {
  /** Nothing to choose. The tool does one thing to whatever it is given. */
  [key: string]: unknown;
}

export const DEFAULTS: StripOptions = {};

/**
 * The formats this refuses, and why it says so rather than trying.
 *
 * AVIF and HEIC keep their metadata in nested boxes that are reached through
 * tables of offsets elsewhere in the file. Removing one means rewriting those
 * tables and every offset after them. That is a great deal of code for a
 * result that is easy to get subtly wrong, and a picture quietly corrupted by
 * a privacy tool is worse than one it declined to touch.
 *
 * WebP used to be on this list and is not any more. Its metadata sits in
 * plain chunks in a flat container, which is the same shape of work as PNG.
 */
const REFUSED: Record<string, string> = {
  avif: "AVIF",
  heic: "HEIC",
};

const STRIPPERS = {
  jpeg: stripJpeg,
  png: stripPng,
  webp: stripWebp,
} as const;

/** The formats this can actually do, taken from the table rather than said
 *  twice. Adding a stripper is then the only edit needed. */
type Strippable = keyof typeof STRIPPERS;

/**
 * Narrows a sniffed format to one this tool handles.
 *
 * The refusal above already rules the others out at run time, but the
 * compiler cannot see that. Asking the table itself keeps the two from
 * drifting: a new format in DecodableFormat with no stripper behind it does
 * not type check here.
 */
function canStrip(format: DecodableFormat): format is Strippable {
  return format in STRIPPERS;
}

export const run: Engine<StripOptions> = async (
  files,
  _options,
  onProgress,
) => {
  if (files.length === 0) {
    throw new Error("Choose a picture first.");
  }

  const results = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onProgress(index / files.length, `Reading ${file.name}`);

    const format = sniff(file.bytes);
    if (!format) {
      throw new Error(
        `${file.name} is not a picture this can read. Choose a JPEG, a PNG ` +
          "or a WebP.",
      );
    }
    const refused = REFUSED[format];
    if (refused) {
      throw new Error(
        `${file.name} is ${refused}. This tool works on JPEG, PNG and WebP, ` +
          "where the metadata can be removed without the picture being " +
          "rebuilt.",
      );
    }

    if (!canStrip(format)) {
      throw new Error(
        `${file.name} is a ${format.toUpperCase()} and this tool has no way ` +
          "to remove its metadata without rebuilding the picture.",
      );
    }

    const { bytes, removed } = STRIPPERS[format](file.bytes);

    results.push({
      name: file.name,
      type: MIME[format],
      bytes,
      // Size alone cannot say this. A file that carried nothing comes back
      // the same size as one whose metadata was removed but was tiny, and the
      // visitor cannot tell the difference from the number on screen.
      note:
        removed === 0
          ? "This file carried no metadata. It is unchanged."
          : `Removed ${removed} bytes of metadata. The picture is untouched.`,
    });
  }

  onProgress(1, "Done");
  return results;
};
