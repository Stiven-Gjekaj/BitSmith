import resize from "@jsquash/resize";
import * as ort from "onnxruntime-web";
import { decode, encode, type RawImage } from "../../lib/image/codecs";
import {
  type Engine,
  type ProgressReporter,
  withExtension,
} from "../../lib/pipeline/types";

export interface BgRemoveOptions {
  /** Where to fetch the model. The page supplies an address on this site. */
  modelUrl: string;
}

/** The size that u2netp takes. Every input is scaled to this square. */
const SIDE = 320;

/** Normalisation that the model was trained with. */
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** Scales a picture with the WebAssembly resizer. */
async function scale(
  image: RawImage,
  width: number,
  height: number,
): Promise<RawImage> {
  return (await resize(image as unknown as ImageData, {
    width,
    height,
  })) as unknown as RawImage;
}

/**
 * Runs the model and returns the picture with a clear background.
 *
 * This is separate from `run` below so that a test can drive it with a model
 * read from disk. Fetching is the part that needs a browser, and it is not
 * the part worth testing.
 */
export async function removeBackground(
  image: RawImage,
  model: ArrayBuffer | Uint8Array,
  onProgress: ProgressReporter = () => {},
): Promise<RawImage> {
  onProgress(0.35, "Starting the model");

  // One thread. Several threads need SharedArrayBuffer, which needs two strict
  // response headers, and GitHub Pages cannot send a custom header at all.
  // Section 11 of docs/plan.md records that trap.
  ort.env.wasm.numThreads = 1;

  const session = await ort.InferenceSession.create(model as Uint8Array, {
    executionProviders: ["wasm"],
  });

  onProgress(0.5, "Looking at the picture");
  const small = await scale(image, SIDE, SIDE);

  // The model wants planar RGB, not the interleaved RGBA that a picture is.
  const input = new Float32Array(3 * SIDE * SIDE);
  const plane = SIDE * SIDE;
  for (let index = 0; index < plane; index += 1) {
    const at = index * 4;
    input[index] = (small.data[at] / 255 - MEAN[0]) / STD[0];
    input[plane + index] = (small.data[at + 1] / 255 - MEAN[1]) / STD[1];
    input[2 * plane + index] = (small.data[at + 2] / 255 - MEAN[2]) / STD[2];
  }

  onProgress(0.6, "Finding the subject");
  const outputs = await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", input, [
      1,
      3,
      SIDE,
      SIDE,
    ]),
  });

  // The model gives seven maps. The first is the one it is most sure about,
  // and the other six are the coarser stages that produced it.
  const raw = outputs[session.outputNames[0]].data as Float32Array;

  onProgress(0.8, "Cutting out the background");

  // The map comes back on its own scale, so stretch it to fill 0 to 1. Without
  // this the mask is either almost transparent or almost solid.
  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;
  for (const value of raw) {
    if (value < lowest) lowest = value;
    if (value > highest) highest = value;
  }
  const span = highest - lowest || 1;

  const maskImage: RawImage = {
    data: new Uint8ClampedArray(plane * 4),
    width: SIDE,
    height: SIDE,
  };
  for (let index = 0; index < plane; index += 1) {
    const value = Math.round(((raw[index] - lowest) / span) * 255);
    const at = index * 4;
    maskImage.data[at] = value;
    maskImage.data[at + 1] = value;
    maskImage.data[at + 2] = value;
    maskImage.data[at + 3] = 255;
  }

  const grown = await scale(maskImage, image.width, image.height);

  const out = new Uint8ClampedArray(image.data.length);
  out.set(image.data);
  for (let index = 0; index < image.width * image.height; index += 1) {
    out[index * 4 + 3] = grown.data[index * 4];
  }

  return { data: out, width: image.width, height: image.height };
}

export const run: Engine<BgRemoveOptions> = async (
  files,
  options,
  onProgress,
) => {
  const file = files[0];
  if (!file) {
    throw new Error("Choose a photograph first.");
  }

  onProgress(0.05, "Reading the picture");
  const image = await decode(file.bytes);

  onProgress(0.15, "Fetching the model, about 4 MB the first time");
  const response = await fetch(options.modelUrl);
  if (!response.ok) {
    throw new Error(
      "The background model did not load. Check your connection and try " +
        "again.",
    );
  }
  const model = await response.arrayBuffer();

  const cut = await removeBackground(image, model, onProgress);

  onProgress(0.92, "Writing the file");
  // PNG only. The result needs a clear background, and JPEG has no way to
  // record one.
  const bytes = await encode(cut, "png");

  return [
    {
      name: withExtension(file.name, "png"),
      type: "image/png",
      bytes,
    },
  ];
};
