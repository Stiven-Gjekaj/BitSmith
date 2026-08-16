import { FileUp, X } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { cn } from "../../lib/utils";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";

interface Props {
  accept?: string;
  multiple?: boolean;
  maxBytes?: number;
  files: File[];
  onChange: (files: File[]) => void;
}

function readable(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Gives each chosen file a stable key for the list below.
 *
 * The position in the array is not a key. Removing the first of three files
 * shifts the other two, and React then reuses the wrong row. Name and date are
 * not a key either, because a visitor can add the same file twice, which is
 * reasonable when merging a PDF into itself.
 *
 * A file picker hands back a new File object every time, so the object itself
 * is the identity. The map holds the objects weakly, so a removed file is
 * collected rather than kept alive by this table.
 */
const keys = new WeakMap<File, string>();
let nextKey = 0;

function keyFor(file: File): string {
  const existing = keys.get(file);
  if (existing) {
    return existing;
  }
  nextKey += 1;
  const key = `file-${nextKey}`;
  keys.set(file, key);
  return key;
}

/**
 * The drop area.
 *
 * It carries a real file input as well as the drop target. A keyboard user
 * cannot drop a file, and a phone has nothing to drop with, so the input is
 * the control that always works.
 */
export function Dropzone({
  accept,
  multiple = false,
  maxBytes,
  files,
  onChange,
}: Props) {
  const inputId = useId();
  const [over, setOver] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const take = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) {
        return;
      }
      const list = Array.from(incoming);

      if (maxBytes) {
        const tooBig = list.find((file) => file.size > maxBytes);
        if (tooBig) {
          // A limit with a clear message beats a crash. Mobile Safari stops a
          // tab that uses too much memory, and the visitor is told nothing.
          setRefused(
            `"${tooBig.name}" is ${readable(tooBig.size)}. This tool takes ` +
              `files up to ${readable(maxBytes)}, because the work happens in ` +
              `your browser and a phone runs out of memory above that.`,
          );
          return;
        }
      }

      setRefused(null);
      onChange(multiple ? [...files, ...list] : [list[0]]);
    },
    [files, maxBytes, multiple, onChange],
  );

  return (
    <div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the label and
          input inside are the accessible control. This element only adds a
          drop target on top of them. */}
      <div
        data-over={over}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed px-6 py-9 text-center transition-colors",
          over
            ? "border-primary bg-primary/10"
            : "border-border bg-background/40 hover:border-ring/60",
        )}
      >
        <p className="text-sm text-muted-foreground">
          Drop {multiple ? "files" : "a file"} here
        </p>

        <Button asChild variant="outline" className="mt-3 cursor-pointer">
          <label htmlFor={inputId}>
            <FileUp aria-hidden="true" />
            Choose {multiple ? "files" : "a file"}
            <input
              id={inputId}
              type="file"
              accept={accept}
              multiple={multiple}
              className="sr-only"
              onChange={(event) => take(event.target.files)}
            />
          </label>
        </Button>

        {maxBytes ? (
          <p className="mt-3 font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
            Up to {readable(maxBytes)}
          </p>
        ) : null}
      </div>

      {refused ? (
        <Alert variant="warning" className="mt-3">
          <AlertDescription>{refused}</AlertDescription>
        </Alert>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {files.map((file, index) => (
            <li
              key={keyFor(file)}
              className="flex items-center gap-3 rounded-md border border-border bg-card/70 px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                {readable(file.size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
