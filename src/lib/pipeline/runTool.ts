import type { WorkerRequest, WorkerResponse } from "../workers/tool.worker";
import type { EngineFile, EngineResult, ProgressReporter } from "./types";

/**
 * Workers that are kept alive between runs.
 *
 * The default is a fresh worker for each run, which costs a few milliseconds
 * and removes a class of bug: a codec that keeps state cannot carry it from
 * one file into the next.
 *
 * A tool with a large model cannot afford that. Building an inference session
 * parses megabytes and compiles a graph, and throwing the worker away throws
 * the session away with it. Those tools ask to keep their worker, and the
 * registry says which ones. The cost is that their engine module keeps state,
 * which is exactly the point.
 */
const kept = new Map<string, Worker>();

/**
 * Omit that keeps a union a union.
 *
 * A plain `Omit<WorkerRequest, "id">` collapses the two request shapes into
 * their shared keys, so the compiler stops believing that a run request
 * carries files. Spreading the union over `extends` applies the omit to each
 * member instead.
 */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

let nextId = 0;

function spawn(): Worker {
  return new Worker(new URL("../workers/tool.worker.ts", import.meta.url), {
    type: "module",
  });
}

function workerFor(slug: string, reuse: boolean): Worker {
  if (!reuse) {
    return spawn();
  }
  const existing = kept.get(slug);
  if (existing) {
    return existing;
  }
  const created = spawn();
  kept.set(slug, created);
  return created;
}

function send<T>(
  slug: string,
  reuse: boolean,
  request: WithoutId<WorkerRequest>,
  onMessage: (
    message: WorkerResponse,
    settle: (value: T) => void,
    fail: (error: Error) => void,
  ) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const worker = workerFor(slug, reuse);
    nextId += 1;
    const id = nextId;

    const done = () => {
      worker.removeEventListener("message", listener);
      worker.removeEventListener("error", failed);
      if (!reuse) {
        worker.terminate();
      }
    };

    const settle = (value: T) => {
      done();
      resolve(value);
    };
    const fail = (error: Error) => {
      done();
      // A kept worker that failed may be in a bad state. Drop it so the next
      // attempt starts clean rather than inheriting the fault.
      if (reuse) {
        kept.delete(slug);
        worker.terminate();
      }
      reject(error);
    };

    const listener = (event: MessageEvent<WorkerResponse>) => {
      // A kept worker can be handling more than one request, so every reply
      // carries the id it belongs to.
      if (event.data.id !== id) {
        return;
      }
      onMessage(event.data, settle, fail);
    };

    const failed = (event: ErrorEvent) =>
      fail(new Error(event.message || "The worker stopped unexpectedly."));

    worker.addEventListener("message", listener);
    worker.addEventListener("error", failed);
    worker.postMessage({ ...request, id } as WorkerRequest);
  });
}

/** Runs one tool and resolves with its output. */
export function runTool(
  slug: string,
  files: EngineFile[],
  options: Record<string, unknown>,
  onProgress: ProgressReporter,
  reuse = false,
): Promise<EngineResult[]> {
  return send<EngineResult[]>(
    slug,
    reuse,
    { kind: "run", slug, files, options },
    (message, settle, fail) => {
      if (message.kind === "progress") {
        onProgress(message.fraction, message.message);
        return;
      }
      if (message.kind === "done") {
        settle(message.results);
        return;
      }
      if (message.kind === "error") {
        fail(new Error(message.message));
      }
    },
  );
}

/**
 * Loads whatever a tool needs before a visitor asks for it.
 *
 * A tool page calls this as it opens. The visitor then spends the download on
 * choosing a file rather than waiting after pressing the button.
 */
export function prepareTool(
  slug: string,
  options: Record<string, unknown>,
): Promise<string | undefined> {
  return send<string | undefined>(
    slug,
    true,
    { kind: "prepare", slug, options },
    (message, settle, fail) => {
      if (message.kind === "ready") {
        settle(message.note);
        return;
      }
      if (message.kind === "error") {
        fail(new Error(message.message));
      }
    },
  );
}
