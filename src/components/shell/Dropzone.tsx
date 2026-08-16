import { useCallback, useId, useRef, useState } from "react";

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
 * the control that always works. Section 17 of docs/plan.md records this.
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
  const inputRef = useRef<HTMLInputElement>(null);

  const accept_ = useCallback(
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
          input inside provide the accessible control; this element only adds
          a pointer affordance on top of it. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          accept_(event.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          over
            ? "border-sky-500 bg-sky-50 dark:bg-sky-950"
            : "border-slate-300 dark:border-slate-700"
        }`}
      >
        <p className="mb-3 text-slate-600 dark:text-slate-400">
          Drop {multiple ? "files" : "a file"} here, or
        </p>

        <label
          htmlFor={inputId}
          className="inline-block cursor-pointer rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 focus-within:ring-2 focus-within:ring-sky-500 dark:bg-slate-100 dark:text-slate-900"
        >
          Choose {multiple ? "files" : "a file"}
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="sr-only"
            onChange={(event) => accept_(event.target.files)}
          />
        </label>

        {maxBytes ? (
          <p className="mt-3 text-sm text-slate-500">
            Up to {readable(maxBytes)}
          </p>
        ) : null}
      </div>

      {refused ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {refused}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={keyFor(file)}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
            >
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-slate-500">
                {readable(file.size)}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="shrink-0 rounded px-2 py-1 text-slate-600 underline hover:text-slate-900 dark:text-slate-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
