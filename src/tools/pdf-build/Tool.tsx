import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { Field, RunButton, Select } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { findTool } from "../registry";
import { DEFAULTS, type Paper } from "./engine";

const meta = findTool("image-to-pdf");

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("image-to-pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [paper, setPaper] = useState<Paper>(DEFAULTS.paper);

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        multiple
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        One page for each picture, in the order listed above. Remove a picture
        or add another to change the order.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Page size">
          {(id) => (
            <Select
              id={id}
              value={paper}
              onChange={(value) => setPaper(value as Paper)}
              options={[
                { value: "a4", label: "A4 (most of the world)" },
                { value: "letter", label: "Letter (North America)" },
                { value: "picture", label: "Cut each page to its picture" },
              ]}
            />
          )}
        </Field>
      </div>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0}
          onClick={() => run(files, { paper, margin: DEFAULTS.margin })}
        >
          Make a PDF{files.length > 1 ? ` from ${files.length} pictures` : ""}
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
