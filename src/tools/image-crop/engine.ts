import resize from "@jsquash/resize";
import {
  decode,
  type EncodableFormat,
  EXTENSION,
  encode,
  MIME,
  type RawImage,
} from "../../lib/image/codecs";
import { type Engine, withExtension } from "../../lib/pipeline/types";

export interface CropOptions {
  /** The part to keep, in pixels of the source picture. */
  crop?: { x: number; y: number; width: number; height: number };
  /** The size to finish at. Leave out to keep the cropped size. */
  resize?: { width: number; height: number };
  format: EncodableFormat;
  quality: number;
}

export const DEFAULTS: CropOptions = { format: "png", quality: 90 };

/** Copies a rectangle out of an image. */
export function cropRaw(
  image: RawImage,
  x: number,
  y: number,
  width: number,
  height: number,
): RawImage {
  // Clamp to the picture. A rectangle that runs off the edge would otherwise
  // read whatever sits after the buffer, which shows as a band of noise.
  const left = Math.max(0, Math.min(Math.round(x), image.width - 1));
  const top = Math.max(0, Math.min(Math.round(y), image.height - 1));
  const right = Math.min(image.width, left + Math.round(width));
  const bottom = Math.min(image.height, top + Math.round(height));

  const outWidth = Math.max(1, right - left);
  const outHeight = Math.max(1, bottom - top);
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let row = 0; row < outHeight; row += 1) {
    const from = ((top + row) * image.width + left) * 4;
    out.set(image.data.subarray(from, from + outWidth * 4), row * outWidth * 4);
  }

  return { data: out, width: outWidth, height: outHeight };
}

export const run: Engine<CropOptions> = async (files, options, onProgress) => {
  const file = files[0];
  if (!file) {
    throw new Error("Choose a picture first.");
  }

  onProgress(0.15, "Reading the picture");
  let image = await decode(file.bytes);

  if (options.crop) {
    onProgress(0.4, "Cutting the picture");
    const { x, y, width, height } = options.crop;
    image = cropRaw(image, x, y, width, height);
  }

  if (options.resize) {
    onProgress(0.6, "Changing the size");
    const width = Math.max(1, Math.round(options.resize.width));
    const height = Math.max(1, Math.round(options.resize.height));
    image = (await resize(image as unknown as ImageData, {
      width,
      height,
    })) as unknown as RawImage;
  }

  onProgress(0.85, "Writing the file");
  const bytes = await encode(image, options.format, options.quality);

  return [
    {
      name: withExtension(file.name, EXTENSION[options.format]),
      type: MIME[options.format],
      bytes,
    },
  ];
};
