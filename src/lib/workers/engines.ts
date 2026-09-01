import type { Engine } from "../pipeline/types";

export interface EngineModule {
  run: Engine<never>;
  /**
   * Optional. A tool with a large model loads it before it is needed, and may
   * report something about how it will run.
   */
  prepare?: (options: never) => Promise<string | undefined>;
}

/**
 * Where each tool's engine lives.
 *
 * This is a module of its own rather than a constant inside the worker,
 * because the worker cannot be imported anywhere else: it calls
 * `self.onmessage` at the top level, so loading it outside a worker throws.
 * That left the map untestable, and a slug missing from it was a fault a
 * visitor found by pressing Run.
 *
 * Vite still splits these, because it reads the import calls where they are
 * written rather than where they are called.
 */
export const engines: Record<string, () => Promise<EngineModule>> = {
  "qr-code-generator": () => import("../../tools/qr-generate/engine"),
  "image-converter": () => import("../../tools/image-convert/engine"),
  "crop-image": () => import("../../tools/image-crop/engine"),
  "rotate-image": () => import("../../tools/image-rotate/engine"),
  "strip-metadata": () => import("../../tools/strip-meta/engine"),
  "compress-image": () => import("../../tools/compress/engine"),
  "merge-pdf": () => import("../../tools/pdf-pages/engine"),
  "image-to-pdf": () => import("../../tools/pdf-build/engine"),
  "pdf-to-image": () => import("../../tools/pdf-raster/engine"),
  "remove-background": () => import("../../tools/bg-remove/engine"),
};
