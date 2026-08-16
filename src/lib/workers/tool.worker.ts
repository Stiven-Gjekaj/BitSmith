/// <reference lib="webworker" />
/**
 * One worker for every tool.
 *
 * The heavy work never runs on the main thread. A large image on the main
 * thread freezes the page, and a frozen page loses the visitor and hurts the
 * speed score that the search rank depends on.
 *
 * Each engine arrives through a dynamic import, so a visitor who opens the QR
 * page never downloads the background removal model.
 */
import type { Engine, EngineFile, EngineResult } from "../pipeline/types";

export interface RunRequest {
  id: number;
  slug: string;
  files: EngineFile[];
  options: Record<string, unknown>;
}

export type RunResponse =
  | { id: number; kind: "progress"; fraction: number; message?: string }
  | { id: number; kind: "done"; results: EngineResult[] }
  | { id: number; kind: "error"; message: string };

type EngineModule = { run: Engine<never> };

const engines: Record<string, () => Promise<EngineModule>> = {
  "qr-code-generator": () => import("../../tools/qr-generate/engine"),
  "image-converter": () => import("../../tools/image-convert/engine"),
  "crop-image": () => import("../../tools/image-crop/engine"),
  "merge-pdf": () => import("../../tools/pdf-pages/engine"),
  "remove-background": () => import("../../tools/bg-remove/engine"),
};

const post = (message: RunResponse) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, slug, files, options } = event.data;

  try {
    const load = engines[slug];
    if (!load) {
      throw new Error(`No engine is registered for "${slug}".`);
    }

    post({ id, kind: "progress", fraction: 0.02, message: "Starting" });

    const module = await load();
    const results = await module.run(
      files,
      options as never,
      (fraction, message) => {
        post({ id, kind: "progress", fraction, message });
      },
    );

    post({ id, kind: "done", results });
  } catch (error) {
    // An engine that fails must say something a visitor can act on. A raw
    // WebAssembly abort reads as nonsense, so anything without a message gets
    // a plain one.
    const message =
      error instanceof Error && error.message
        ? error.message
        : "The work failed. The file may be damaged or in a format the tool " +
          "does not read.";
    post({ id, kind: "error", message });
  }
};
