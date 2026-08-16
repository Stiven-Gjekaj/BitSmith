import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { Field, RunButton, Select } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import type { EncodableFormat } from "../../lib/image/codecs";
import { findTool } from "../registry";
import { DEFAULTS } from "./engine";

const meta = findTool("pdf-to-image");

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("pdf-to-image");
  const [files, setFiles] = useState<File[]>([]);
  const [dpi, setDpi] = useState(String(DEFAULTS.dpi));
  const [format, setFormat] = useState<EncodableFormat>(DEFAULTS.format);

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        One picture for each page, numbered so they stay in order.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Detail" hint="Higher looks better and takes longer.">
          {(id) => (
            <Select
              id={id}
              value={dpi}
              onChange={setDpi}
              options={[
                { value: "96", label: "Screen (96 dpi)" },
                { value: "150", label: "Good (150 dpi)" },
                { value: "300", label: "Print (300 dpi, slow)" },
              ]}
            />
          )}
        </Field>

        <Field label="Save as">
          {(id) => (
            <Select
              id={id}
              value={format}
              onChange={(value) => setFormat(value as EncodableFormat)}
              options={[
                { value: "png", label: "PNG (sharp text)" },
                { value: "jpeg", label: "JPEG (smaller files)" },
                { value: "webp", label: "WebP (smaller still)" },
              ]}
            />
          )}
        </Field>
      </div>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0}
          onClick={() =>
            run(files, {
              dpi: Number(dpi),
              format,
              quality: DEFAULTS.quality,
            })
          }
        >
          Turn the pages into pictures
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
