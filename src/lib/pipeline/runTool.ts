import type { RunRequest, RunResponse } from "../workers/tool.worker";
import type { EngineFile, EngineResult, ProgressReporter } from "./types";

/**
 * Runs one tool in a Web Worker and resolves with its output.
 *
 * A fresh worker starts for each run and stops afterwards. That costs a few
 * milliseconds and removes a whole class of bug: a codec that keeps state
 * cannot carry it from one file into the next.
 */
export function runTool(
  slug: string,
  files: EngineFile[],
  options: Record<string, unknown>,
  onProgress: ProgressReporter,
): Promise<EngineResult[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/tool.worker.ts", import.meta.url),
      { type: "module" },
    );

    const id = Date.now();

    const finish = () => worker.terminate();

    worker.onmessage = (event: MessageEvent<RunResponse>) => {
      const message = event.data;
      if (message.id !== id) {
        return;
      }

      if (message.kind === "progress") {
        onProgress(message.fraction, message.message);
        return;
      }

      if (message.kind === "done") {
        finish();
        resolve(message.results);
        return;
      }

      finish();
      reject(new Error(message.message));
    };

    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "The worker stopped unexpectedly."));
    };

    const request: RunRequest = { id, slug, files, options };
    worker.postMessage(request);
  });
}
