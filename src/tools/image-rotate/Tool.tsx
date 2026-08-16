import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { Field, RunButton, Select } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { Button } from "../../components/ui/button";
import { Slider } from "../../components/ui/slider";
import type { EncodableFormat } from "../../lib/image/codecs";
import { findTool } from "../registry";
import { DEFAULTS, type Turns } from "./engine";

const meta = findTool("rotate-image");

/**
 * The turn and the mirrors are buttons, and every one of them is on screen
 * from the moment the page opens.
 *
 * That is deliberate. tests/e2e/pdf.spec.ts records a failure that nobody has
 * explained, where a browser test changed a control and then acted on what
 * that change revealed. Controls that are always present cannot reproduce it,
 * and for this job they are the better control anyway: four turns and two
 * mirrors are easier to hit than a menu to open and read.
 */
const TURNS: { value: Turns; label: string }[] = [
  { value: 0, label: "None" },
  { value: 1, label: "90 right" },
  { value: 2, label: "180" },
  { value: 3, label: "90 left" },
];

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("rotate-image");
  const [files, setFiles] = useState<File[]>([]);
  const [turns, setTurns] = useState<Turns>(DEFAULTS.turns);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [format, setFormat] = useState<EncodableFormat>(DEFAULTS.format);
  const [quality, setQuality] = useState(DEFAULTS.quality);

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        multiple
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <div className="mt-6 grid gap-5">
        <Field label="Turn" hint="Clockwise.">
          {(id) => (
            <div id={id} className="flex flex-wrap gap-2">
              {TURNS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={turns === option.value ? "secondary" : "outline"}
                  aria-pressed={turns === option.value}
                  onClick={() => setTurns(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Mirror" hint="Applied after the turn.">
          {(id) => (
            <div id={id} className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={flipHorizontal ? "secondary" : "outline"}
                aria-pressed={flipHorizontal}
                onClick={() => setFlipHorizontal(!flipHorizontal)}
              >
                Left to right
              </Button>
              <Button
                type="button"
                size="sm"
                variant={flipVertical ? "secondary" : "outline"}
                aria-pressed={flipVertical}
                onClick={() => setFlipVertical(!flipVertical)}
              >
                Top to bottom
              </Button>
            </div>
          )}
        </Field>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Save as">
          {(id) => (
            <Select
              id={id}
              value={format}
              onChange={(value) => setFormat(value as EncodableFormat)}
              options={[
                { value: "png", label: "PNG (lossless, keeps clear areas)" },
                { value: "jpeg", label: "JPEG (photographs)" },
                { value: "webp", label: "WebP (small, wide support)" },
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
          onClick={() =>
            run(files, {
              turns,
              flipHorizontal,
              flipVertical,
              format,
              quality,
            })
          }
        >
          Turn {files.length > 1 ? `${files.length} pictures` : "the picture"}
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
