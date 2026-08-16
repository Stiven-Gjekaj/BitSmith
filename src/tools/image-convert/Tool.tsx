import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { Field, RunButton, Select } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { Slider } from "../../components/ui/slider";
import type { EncodableFormat } from "../../lib/image/codecs";
import { findTool } from "../registry";
import { DEFAULTS } from "./engine";

const meta = findTool("image-converter");

interface Props {
  /**
   * Set by a conversion page, so `/png-to-jpg` opens pointed at JPG and
   * accepting a PNG.
   *
   * The controls stay visible and usable. A page that locked them would be a
   * page built for a search engine rather than for the person who arrived, and
   * a visitor who changes their mind should not have to find another address.
   */
  preset?: { format?: EncodableFormat; accept?: string };
}

export default function Tool({ preset }: Props) {
  const { state, run, reset, resultRef } = useToolRun("image-converter");
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<EncodableFormat>(
    preset?.format ?? DEFAULTS.format,
  );
  const [quality, setQuality] = useState(DEFAULTS.quality);

  return (
    <div>
      <Dropzone
        accept={preset?.accept ?? meta?.accept}
        multiple
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Convert to">
          {(id) => (
            <Select
              id={id}
              value={format}
              onChange={(value) => setFormat(value as EncodableFormat)}
              options={[
                { value: "webp", label: "WebP (small, wide support)" },
                { value: "jpeg", label: "JPEG (photographs)" },
                { value: "png", label: "PNG (lossless, keeps clear areas)" },
                { value: "avif", label: "AVIF (smallest, slower)" },
              ]}
            />
          )}
        </Field>

        <Field
          label={`Quality: ${quality}`}
          hint={
            format === "png"
              ? "PNG is lossless, so quality does nothing here."
              : "Lower makes a smaller file."
          }
        >
          {(id) => (
            <Slider
              id={id}
              min={10}
              max={100}
              step={1}
              value={[quality]}
              disabled={format === "png"}
              onValueChange={([next]) => setQuality(next)}
              aria-label="Quality"
              className="py-2"
            />
          )}
        </Field>
      </div>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0}
          onClick={() => run(files, { format, quality })}
        >
          Convert{" "}
          {files.length > 1 ? `${files.length} pictures` : "the picture"}
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
