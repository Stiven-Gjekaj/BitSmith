import {
  decode,
  type EncodableFormat,
  EXTENSION,
  encode,
  MIME,
  type RawImage,
} from "../../lib/image/codecs";
import { type Engine, withExtension } from "../../lib/pipeline/types";

/** Quarter turns clockwise. Anything else is one of these four. */
export type Turns = 0 | 1 | 2 | 3;

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

/**
 * Turns a picture a quarter of the way round, clockwise.
 *
 * Width and height swap. That is the part worth testing, because a picture
 * that keeps its old width still looks plausible on screen while every row
 * after the first is wrong.
 */
function quarterTurn(image: RawImage): RawImage {
  const { data, width, height } = image;
  const out = new Uint8ClampedArray(data.length);
  const outWidth = height;
  const outHeight = width;

  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      // Clockwise: the left column of the source becomes the top row of the
      // result, read from the bottom up.
      const from = ((height - 1 - x) * width + y) * 4;
      const to = (y * outWidth + x) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }

  return { data: out, width: outWidth, height: outHeight };
}

/** Turns a picture by any number of quarters, clockwise. */
export function rotateRaw(image: RawImage, turns: Turns): RawImage {
  let out = image;
  // A negative or oversized count is folded into the four that exist, so the
  // caller cannot ask for something this cannot do.
  const count = ((turns % 4) + 4) % 4;
  for (let done = 0; done < count; done += 1) {
    out = quarterTurn(out);
  }
  return out;
}

/** Mirrors a picture. The size does not change. */
export function flipRaw(
  image: RawImage,
  axis: "horizontal" | "vertical",
): RawImage {
  const { data, width, height } = image;
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = axis === "horizontal" ? width - 1 - x : x;
      const sourceY = axis === "vertical" ? height - 1 - y : y;
      const from = (sourceY * width + sourceX) * 4;
      const to = (y * width + x) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }

  return { data: out, width, height };
}

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
