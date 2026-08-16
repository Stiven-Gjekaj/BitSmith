import {
  decode,
  EXTENSION,
  encode,
  type ImageFormat,
  MIME,
} from "../../lib/image/codecs";
import { type Engine, withExtension } from "../../lib/pipeline/types";

export interface ConvertOptions {
  format: ImageFormat;
  quality: number;
}

export const DEFAULTS: ConvertOptions = { format: "webp", quality: 82 };

/**
 * Converts each picture to the chosen format.
 *
 * Every file is decoded to raw pixels and encoded again. There is no shortcut
 * for a file that is already in the target format, because the visitor may
 * have asked for a different quality.
 */
export const run: Engine<ConvertOptions> = async (
  files,
  options,
  onProgress,
) => {
  if (files.length === 0) {
    throw new Error("Choose at least one picture first.");
  }

  const results = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const start = index / files.length;
    const share = 1 / files.length;

    onProgress(start + share * 0.1, `Reading ${file.name}`);
    const image = await decode(file.bytes);

    onProgress(start + share * 0.5, `Writing ${file.name}`);
    const bytes = await encode(image, options.format, options.quality);

    results.push({
      name: withExtension(file.name, EXTENSION[options.format]),
      type: MIME[options.format],
      bytes,
    });
  }

  onProgress(1, "Finished");
  return results;
};
