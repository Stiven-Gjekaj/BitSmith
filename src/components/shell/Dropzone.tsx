import { useCallback, useId, useState } from "react";

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
        className="drop"
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
      >
        <p className="drop-note">Drop {multiple ? "files" : "a file"} here</p>

        <label htmlFor={inputId} className="drop-pick">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 17V5M7 10l5-5 5 5M5 19h14" />
          </svg>
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

        {maxBytes ? (
          <p className="drop-limit">Up to {readable(maxBytes)}</p>
        ) : null}
      </div>

      {refused ? (
        <p role="alert" className="alert alert-warn" style={{ marginTop: 12 }}>
          {refused}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {files.map((file, index) => (
            <li key={keyFor(file)} className="file-row">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{readable(file.size)}</span>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
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
