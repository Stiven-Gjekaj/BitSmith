import {
  decode,
  type EncodableFormat,
  EXTENSION,
  encode,
  MIME,
  type RawImage,
} from "../../lib/image/codecs";
import { flipRaw, rotateRaw, type Turns } from "../../lib/image/transform";
import { type Engine, withExtension } from "../../lib/pipeline/types";

export type { Turns };

export interface RotateOptions {
  turns: Turns;
  /** Mirror left to right. Applied after the turn. */
  flipHorizontal: boolean;
  /** Mirror top to bottom. Applied after the turn. */
  flipVertical: boolean;
  format: EncodableFormat;
  quality: number;
}

export const DEFAULTS: RotateOptions = {
  turns: 1,
  flipHorizontal: false,
  flipVertical: false,
  format: "png",
  quality: 90,
};

export const run: Engine<RotateOptions> = async (
  files,
  options,
  onProgress,
) => {
  if (files.length === 0) {
    throw new Error("Choose a picture first.");
  }

  const results = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const start = index / files.length;
    const share = 1 / files.length;

    onProgress(start + share * 0.15, `Reading ${file.name}`);
    let image = await decode(file.bytes);

    if (options.turns !== 0) {
      onProgress(start + share * 0.4, "Turning the picture");
      image = rotateRaw(image, options.turns);
    }
    if (options.flipHorizontal) {
      onProgress(start + share * 0.55, "Mirroring left to right");
      image = flipRaw(image, "horizontal");
    }
    if (options.flipVertical) {
      onProgress(start + share * 0.7, "Mirroring top to bottom");
      image = flipRaw(image, "vertical");
    }

    onProgress(start + share * 0.85, "Writing the file");
    const bytes = await encode(image, options.format, options.quality);

    results.push({
      name: withExtension(file.name, EXTENSION[options.format]),
      type: MIME[options.format],
      bytes,
    });
  }

  onProgress(1, "Done");
  return results;
};
