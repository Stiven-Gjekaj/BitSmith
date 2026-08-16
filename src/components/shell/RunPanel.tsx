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
    <li className="result">
      {isImage && url ? (
        <img src={url} alt={result.name} className="result-image" />
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="file-name" style={{ fontWeight: 560 }}>
            {result.name}
          </p>
          <p className="tag" style={{ marginTop: 2 }}>
            {readable(result.bytes.byteLength)}
          </p>
        </div>

        {url ? (
          <a
            href={url}
            download={result.name}
            className="btn"
            style={{ marginLeft: "auto", textDecoration: "none" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v12M7 12l5 5 5-5M5 20h14" />
            </svg>
            Download
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function RunPanel({ state, resultRef, onReset }: Props) {
  return (
    <div style={{ marginTop: 22 }}>
      {/* The live region announces progress to a screen reader. Without it the
          page looks frozen to anybody who cannot see the bar move. */}
      <div aria-live="polite" className="sr-only">
        {state.busy ? state.message : ""}
        {state.results ? "The work is finished." : ""}
      </div>

      {state.busy ? (
        <div>
          <div className="bar">
            <div
              className="bar-fill"
              style={{
                width: `${Math.max(4, Math.round(state.fraction * 100))}%`,
              }}
            />
          </div>
          <p className="tag" style={{ marginTop: 10 }}>
            {state.message}
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="alert alert-bad">
          {state.error}
        </p>
      ) : null}

      {state.results ? (
        <div ref={resultRef} tabIndex={-1} style={{ outline: "none" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2 className="tag">
              {state.results.length === 1
                ? "Your file"
                : `Your ${state.results.length} files`}
            </h2>
            <button type="button" className="btn-quiet" onClick={onReset}>
              Start again
            </button>
          </div>

          <ul style={{ display: "grid", gap: 14 }}>
            {state.results.map((result) => (
              <ResultRow key={result.name} result={result} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
