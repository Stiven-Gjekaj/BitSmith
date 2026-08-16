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

export type WorkerRequest =
  | {
      id: number;
      kind: "run";
      slug: string;
      files: EngineFile[];
      options: Record<string, unknown>;
    }
  | {
      id: number;
      kind: "prepare";
      slug: string;
      options: Record<string, unknown>;
    };

export type WorkerResponse =
  | { id: number; kind: "progress"; fraction: number; message?: string }
  | { id: number; kind: "done"; results: EngineResult[] }
  | { id: number; kind: "ready"; note?: string }
  | { id: number; kind: "error"; message: string };

interface EngineModule {
  run: Engine<never>;
  /**
   * Optional. A tool with a large model loads it before it is needed, and may
   * report something about how it will run.
   */
  prepare?: (options: never) => Promise<string | undefined>;
}

const engines: Record<string, () => Promise<EngineModule>> = {
  "qr-code-generator": () => import("../../tools/qr-generate/engine"),
  "image-converter": () => import("../../tools/image-convert/engine"),
  "crop-image": () => import("../../tools/image-crop/engine"),
  "rotate-image": () => import("../../tools/image-rotate/engine"),
  "strip-metadata": () => import("../../tools/strip-meta/engine"),
  "merge-pdf": () => import("../../tools/pdf-pages/engine"),
  "remove-background": () => import("../../tools/bg-remove/engine"),
};

const post = (message: WorkerResponse) => {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
};

async function load(slug: string): Promise<EngineModule> {
  const loader = engines[slug];
  if (!loader) {
    throw new Error(`No engine is registered for "${slug}".`);
  }
  return loader();
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const { id, slug } = request;

  try {
    const module = await load(slug);

    if (request.kind === "prepare") {
      // Nothing to prepare is not a failure. Most tools have no model.
      const note = await module.prepare?.(request.options as never);
      post({ id, kind: "ready", note: note ?? undefined });
      return;
    }

    post({ id, kind: "progress", fraction: 0.02, message: "Starting" });

    const results = await module.run(
      request.files,
      request.options as never,
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
