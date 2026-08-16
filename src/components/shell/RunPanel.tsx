import { useEffect, useState } from "react";
import type { EngineResult } from "../../lib/pipeline/types";
import type { RunState } from "./useToolRun";

interface Props {
  state: RunState;
  resultRef: React.RefObject<HTMLDivElement | null>;
  onReset: () => void;
}

function readable(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Holds one object URL for the life of one result.
 *
 * A tool can produce a result of many megabytes. The browser keeps the bytes
 * behind an object URL alive until the URL is revoked, so a visitor who
 * converts twenty pictures would otherwise hold all twenty in memory. This
 * revokes each one when its result leaves the page.
 */
function useObjectUrl(result: EngineResult): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const blob = new Blob([result.bytes as BlobPart], { type: result.type });
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [result]);

  return url;
}

function ResultRow({ result }: { result: EngineResult }) {
  const url = useObjectUrl(result);
  const isImage = result.type.startsWith("image/");

  return (
    <li className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      {isImage && url ? (
        <img
          src={url}
          alt={result.name}
          className="mb-3 max-h-64 w-auto rounded-lg bg-[repeating-conic-gradient(#e2e8f0_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{result.name}</p>
          <p className="text-sm text-slate-500">
            {readable(result.bytes.byteLength)}
          </p>
        </div>

        {url ? (
          <a
            href={url}
            download={result.name}
            className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700"
          >
            Download
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function RunPanel({ state, resultRef, onReset }: Props) {
  return (
    <div className="mt-6">
      {/* The live region announces progress to a screen reader. Without it the
          page looks frozen to anybody who cannot see the bar move. */}
      <div aria-live="polite" className="sr-only">
        {state.busy ? state.message : ""}
        {state.results ? "The work is finished." : ""}
      </div>

      {state.busy ? (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-sky-600 transition-[width] duration-200"
              style={{ width: `${Math.round(state.fraction * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {state.message}
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      {state.results ? (
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {state.results.length === 1
                ? "Your file"
                : `Your ${state.results.length} files`}
            </h2>
            <button
              type="button"
              onClick={onReset}
              className="text-sm underline hover:no-underline"
            >
              Start again
            </button>
          </div>

          <ul className="space-y-4">
            {state.results.map((result) => (
              <ResultRow key={result.name} result={result} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
