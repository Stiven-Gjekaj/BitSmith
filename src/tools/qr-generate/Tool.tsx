import { useState } from "react";
import {
  Field,
  RunButton,
  Select,
  TextArea,
} from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { DEFAULTS, type QrOptions } from "./engine";

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("qr-code-generator");
  const [options, setOptions] = useState<QrOptions>(DEFAULTS);

  const set = <K extends keyof QrOptions>(key: K, value: QrOptions[K]) =>
    setOptions((previous) => ({ ...previous, [key]: value }));

  return (
    <div>
      <div className="space-y-4">
        <Field label="Text or link" hint="Anything a phone camera should read.">
          {(id) => (
            <TextArea
              id={id}
              value={options.text}
              onChange={(text) => set("text", text)}
              placeholder="https://example.com"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="File type" hint="SVG stays sharp at any size.">
            {(id) => (
              <Select
                id={id}
                value={options.format}
                onChange={(value) =>
                  set("format", value as QrOptions["format"])
                }
                options={[
                  { value: "svg", label: "SVG" },
                  { value: "png", label: "PNG" },
                ]}
              />
            )}
          </Field>

          <Field label="Error correction" hint="Higher survives more damage.">
            {(id) => (
              <Select
                id={id}
                value={options.errorCorrection}
                onChange={(value) =>
                  set("errorCorrection", value as QrOptions["errorCorrection"])
                }
                options={[
                  { value: "L", label: "Low" },
                  { value: "M", label: "Medium" },
                  { value: "Q", label: "Quartile" },
                  { value: "H", label: "High" },
                ]}
              />
            )}
          </Field>

          <Field label="Quiet margin" hint="Blank modules around the code.">
            {(id) => (
              <Select
                id={id}
                value={String(options.margin)}
                onChange={(value) => set("margin", Number(value))}
                options={[
                  { value: "0", label: "None" },
                  { value: "2", label: "Small" },
                  { value: "4", label: "Wide" },
                ]}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={options.text.trim() === ""}
          onClick={() => run([], { ...options })}
        >
          Make the code
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
