import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import type { EngineResult } from "../../lib/pipeline/types";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
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
    <li>
      <Card className="p-4">
        {isImage && url ? (
          // The chequer behind the picture is what shows a clear background as
          // clear. On a flat ground a transparent result looks like a mistake.
          <img
            src={url}
            alt={result.name}
            className="mb-3 max-h-64 w-auto rounded-md [background-image:linear-gradient(45deg,var(--border)_25%,transparent_25%),linear-gradient(-45deg,var(--border)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--border)_75%),linear-gradient(-45deg,transparent_75%,var(--border)_75%)] [background-position:0_0,0_8px,8px_-8px,-8px_0] [background-size:16px_16px]"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{result.name}</p>
            <p className="tag mt-0.5">{readable(result.bytes.byteLength)}</p>
          </div>

          {url ? (
            <Button asChild className="ml-auto">
              <a href={url} download={result.name}>
                <Download aria-hidden="true" />
                Download
              </a>
            </Button>
          ) : null}
        </div>
      </Card>
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
          <Progress value={Math.max(4, Math.round(state.fraction * 100))} />
          <p className="tag mt-2.5">{state.message}</p>
        </div>
      ) : null}

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.results ? (
        <div ref={resultRef} tabIndex={-1} className="outline-none">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="tag">
              {state.results.length === 1
                ? "Your file"
                : `Your ${state.results.length} files`}
            </h2>
            <Button variant="link" size="sm" onClick={onReset}>
              Start again
            </Button>
          </div>

          <ul className="grid gap-3.5">
            {state.results.map((result) => (
              <ResultRow key={result.name} result={result} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
