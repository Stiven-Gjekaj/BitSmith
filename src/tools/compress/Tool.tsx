import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import {
  Field,
  NumberInput,
  RunButton,
  Select,
} from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { findTool } from "../registry";
import { type CompressFormat, DEFAULTS } from "./engine";

const meta = findTool("compress-image");

/**
 * Both controls are on screen from the start, and neither reveals the other.
 *
 * The size is typed in kilobytes because that is the unit an upload limit is
 * always written in. Somebody told a form takes 2 MB types 2000, and somebody
 * told 500 KB types 500.
 */
export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("compress-image");
  const [files, setFiles] = useState<File[]>([]);
  const [kilobytes, setKilobytes] = useState<number | "">(
    DEFAULTS.targetBytes / 1024,
  );
  const [format, setFormat] = useState<CompressFormat>(DEFAULTS.format);

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        multiple
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field
          label="Fit inside (KB)"
          hint="The size an upload form allows, in kilobytes."
        >
          {(id) => (
            <NumberInput
              id={id}
              min={1}
              max={50_000}
              value={kilobytes}
              onChange={setKilobytes}
            />
          )}
        </Field>

        <Field
          label="Save as"
          hint="PNG is not offered. It is lossless, so there is no quality to trade."
        >
          {(id) => (
            <Select
              id={id}
              value={format}
              onChange={(value) => setFormat(value as CompressFormat)}
              options={[
                { value: "jpeg", label: "JPEG (photographs, fastest)" },
                { value: "webp", label: "WebP (smaller, wide support)" },
                { value: "avif", label: "AVIF (smallest, slowest)" },
              ]}
            />
          )}
        </Field>
      </div>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0 || kilobytes === "" || kilobytes < 1}
          onClick={() =>
            run(files, {
              targetBytes: Math.round(Number(kilobytes) * 1024),
              format,
            })
          }
        >
          Compress{" "}
          {files.length > 1 ? `${files.length} pictures` : "the picture"}
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
