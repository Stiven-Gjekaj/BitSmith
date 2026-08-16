import resize from "@jsquash/resize";
// The wasm entry point, and not the package root.
//
// The root pulls in the JSEP build, which carries WebGPU and WebNN support in
// a 25.6 MB WebAssembly file. This project asks for the wasm execution
// provider only, so all of that arrives and none of it runs. The wasm entry
// point ships a 12.9 MB file instead, which is half the cold start.
import * as ort from "onnxruntime-web/wasm";
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

/**
 * The session, kept between runs.
 *
 * Building a session parses 2.3 MB of model and compiles the graph. Doing that
 * again for a second photograph is pure waste, so the worker that owns this
 * module stays alive and the session stays with it. `reusesWorker` on the
 * registry entry is what keeps that worker.
 */
let session: ort.InferenceSession | null = null;
let sessionUrl: string | null = null;
let starting: Promise<ort.InferenceSession> | null = null;

async function build(modelUrl: string): Promise<ort.InferenceSession> {
  // Threads need SharedArrayBuffer, and a browser only offers that to a page
  // that is cross-origin isolated. The service worker in
  // public/remove-background/coi.js supplies the headers that GitHub Pages
  // cannot, so this asks the browser what it actually got rather than
  // assuming either answer.
  //
  // The measured difference is the whole point of that worker: one core runs
  // this model in about five seconds.
  ort.env.wasm.simd = true;

  // onnxruntime works out the address of its thread script from this path.
  // The bundled copies carry a hash in the name, so it would look for a file
  // that does not exist. These are plain copies, put there by
  // scripts/copy-ort.mjs.
  ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}ort/`;

  const response = await fetch(modelUrl);
  if (!response.ok) {
    throw new Error(
      "The background model did not load. Check your connection and try again.",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());

  // One thread, always.
  //
  // Threads need SharedArrayBuffer, which needs cross-origin isolation, which
  // GitHub Pages cannot give. A service worker can supply the headers, and
  // that part worked: the page reported crossOriginIsolated. onnxruntime then
  // hung inside session creation and never came back, on every attempt, with
  // no error to catch and a fallback timer that could not rescue it, because
  // the backend is initialised once and stays broken.
  //
  // So this asks for one thread and gets a working tool. The measured cost is
  // about five seconds for each photograph.
  ort.env.wasm.numThreads = 1;

  const built = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  session = built;
  sessionUrl = modelUrl;
  return built;
}

/**
 * Loads the model, or returns the one already loaded.
 *
 * Two calls that arrive together share one download. Without the `starting`
 * promise, opening the page and pressing the button quickly would fetch the
 * model twice and build two sessions.
 */
export function warm(modelUrl: string): Promise<ort.InferenceSession> {
  if (session && sessionUrl === modelUrl) {
    return Promise.resolve(session);
  }
  if (!starting) {
    starting = build(modelUrl).finally(() => {
      starting = null;
    });
  }
  return starting;
}

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
 * read from disk. Fetching is the part that needs a browser, and it is not the
 * part worth testing.
 */
export async function removeBackground(
  image: RawImage,
  loaded: ort.InferenceSession,
  onProgress: ProgressReporter = () => {},
): Promise<RawImage> {
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
  const outputs = await loaded.run({
    [loaded.inputNames[0]]: new ort.Tensor("float32", input, [
      1,
      3,
      SIDE,
      SIDE,
    ]),
  });

  // The model gives seven maps. The first is the one it is most sure about,
  // and the other six are the coarser stages that produced it.
  const raw = outputs[loaded.outputNames[0]].data as Float32Array;

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

/** Loads the model without doing any work, so a run afterwards is quick. */
export async function prepare(options: BgRemoveOptions): Promise<void> {
  await warm(options.modelUrl);
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

  onProgress(0.15, "Getting the model ready");
  const loaded = await warm(options.modelUrl);

  const cut = await removeBackground(image, loaded, onProgress);

  onProgress(0.92, "Writing the file");
  // PNG only. The result needs a clear background, and JPEG has no way to
  // record one.
  const bytes = await encode(cut, "png");

  return [{ name: withExtension(file.name, "png"), type: "image/png", bytes }];
};
