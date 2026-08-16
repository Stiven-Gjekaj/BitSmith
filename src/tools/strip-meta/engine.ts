import { sniff } from "../../lib/image/codecs";
import type { Engine } from "../../lib/pipeline/types";
import { stripJpeg } from "./jpeg";
import { stripPng } from "./png";

export interface StripOptions {
  /** Nothing to choose. The tool does one thing to whatever it is given. */
  [key: string]: unknown;
}

export const DEFAULTS: StripOptions = {};

/**
 * The formats this refuses, and why it says so rather than trying.
 *
 * WebP, AVIF and HEIC keep their metadata in nested boxes that are referenced
 * by tables of offsets elsewhere in the file. Removing one means rewriting
 * those tables and every offset after it. That is a great deal of code for a
 * result that is easy to get subtly wrong, and a picture quietly corrupted by
 * a privacy tool is worse than a picture it declined to touch.
 */
const REFUSED: Record<string, string> = {
  webp: "WebP",
  avif: "AVIF",
  heic: "HEIC",
};

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
        `${file.name} is not a picture this can read. Choose a JPEG or a PNG.`,
      );
    }
    const refused = REFUSED[format];
    if (refused) {
      throw new Error(
        `${file.name} is ${refused}. This tool works on JPEG and PNG, where ` +
          "the metadata can be removed without the picture being rebuilt.",
      );
    }

    const { bytes, removed } =
      format === "jpeg" ? stripJpeg(file.bytes) : stripPng(file.bytes);

    results.push({
      name: file.name,
      type: format === "jpeg" ? "image/jpeg" : "image/png",
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
