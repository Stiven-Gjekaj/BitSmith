import resize from "@jsquash/resize";
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

/** Which of the two runtimes ended up doing the work. */
export type Backend = "webgpu" | "processor";

/** The size that u2netp takes. Every input is scaled to this square. */
const SIDE = 320;

/** Normalisation that the model was trained with. */
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/**
 * The two onnxruntime builds, and why neither is imported at the top.
 *
 * The processor build is 12.9 MB of WebAssembly. The build that can drive a
 * graphics card is 25.6 MB, because it carries WebGPU and WebNN support.
 * Importing both at the top would bundle both and send 38 MB to everybody.
 *
 * Each import below is dynamic, so the bundler gives each one its own chunk
 * and a visitor fetches only the one their browser can use.
 */
type Runtime = typeof import("onnxruntime-web/wasm");
type Session = import("onnxruntime-web/wasm").InferenceSession;

let runtime: Runtime | null = null;
let backend: Backend = "processor";

let session: Session | null = null;
let sessionUrl: string | null = null;
let starting: Promise<Session> | null = null;

export function currentBackend(): Backend {
  return backend;
}

/** Asks the browser whether a graphics adapter is really available. */
async function hasGraphics(): Promise<boolean> {
  const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } })
    .gpu;
  if (!gpu) {
    return false;
  }
  try {
    // Having the object is not having an adapter. A browser can offer the API
    // and then refuse to hand one out, on a machine with no suitable card.
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

function configure(module: Runtime) {
  // onnxruntime works out the address of its runtime files from this path.
  // The bundled copies carry a hash in the name, so it would look for a file
  // that does not exist. These are plain copies, put there by
  // scripts/copy-ort.mjs.
  module.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}ort/`;

  // One thread. Threads need SharedArrayBuffer, which needs cross-origin
  // isolation, which GitHub Pages cannot give. A service worker was tried and
  // onnxruntime hung inside session creation every time, with no error to
  // catch, so this asks for one thread and gets a working tool.
  module.env.wasm.numThreads = 1;
  module.env.wasm.simd = true;
}

/**
 * Refuses to wait for ever, and says why it gave up.
 *
 * A hang here would look to a visitor like a slow download. A silent failure
 * is worse: the tool quietly takes the slow path and nobody can tell whether
 * the fast one was ever tried. Both are reported to the console.
 */
function within<T>(
  work: Promise<T>,
  ms: number,
  what: string,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;

  return Promise.race([
    work
      .catch((error) => {
        console.warn(
          `${what} did not start, using the processor instead:`,
          error,
        );
        return null;
      })
      // Stop the timer once the work has settled. Without this the warning
      // below arrives twenty seconds after a decision that was already made,
      // and reads as a second, separate failure.
      .finally(() => clearTimeout(timer)),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`${what} took longer than ${ms} ms, using the processor.`);
        resolve(null);
      }, ms);
    }),
  ]);
}

async function build(modelUrl: string): Promise<Session> {
  const response = await fetch(modelUrl);
  if (!response.ok) {
    throw new Error(
      "The background model did not load. Check your connection and try again.",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const options = { graphOptimizationLevel: "all" as const };

  // The graphics card first, where there is one. The model is stored at half
  // precision and a card that reports shader-f16 runs it in the format it is
  // already in.
  if (await hasGraphics()) {
    const gpu = (await import("onnxruntime-web/webgpu")) as unknown as Runtime;
    configure(gpu);

    const made = await within(
      gpu.InferenceSession.create(bytes, {
        ...options,
        executionProviders: ["webgpu"],
      }),
      20_000,
      "WebGPU",
    );

    if (made) {
      runtime = gpu;
      backend = "webgpu";
      session = made;
      sessionUrl = modelUrl;
      return made;
    }
    // A card that refuses the model is not worth an error. Fall through to the
    // processor, which always works.
  }

  const cpu = await import("onnxruntime-web/wasm");
  configure(cpu);
  const made = await cpu.InferenceSession.create(bytes, {
    ...options,
    executionProviders: ["wasm"],
  });

  runtime = cpu;
  backend = "processor";
  session = made;
  sessionUrl = modelUrl;
  return made;
}

/**
 * Loads the model, or returns the one already loaded.
 *
 * Building a session parses 2.3 MB of model and compiles the graph, so the
 * worker that owns this module stays alive and the session stays with it.
 * `reusesWorker` on the registry entry is what keeps that worker.
 *
 * Two calls that arrive together share one download. Without the `starting`
 * promise, opening the page and pressing the button quickly would fetch the
 * model twice and build two sessions.
 */
export function warm(modelUrl: string): Promise<Session> {
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
  loaded: Session,
  onProgress: ProgressReporter = () => {},
): Promise<RawImage> {
  // A test builds its own session and never calls warm, so the runtime may not
  // be loaded yet. Node has no graphics adapter, so this takes the processor
  // build, which is the same module the test used.
  if (!runtime) {
    runtime = await import("onnxruntime-web/wasm");
    configure(runtime);
  }

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
    [loaded.inputNames[0]]: new runtime.Tensor("float32", input, [
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

/** Loads the model without doing any work, and says which runtime it got. */
export async function prepare(options: BgRemoveOptions): Promise<Backend> {
  await warm(options.modelUrl);
  return backend;
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
