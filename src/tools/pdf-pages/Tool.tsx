import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import {
  Field,
  RunButton,
  Select,
  TextInput,
} from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { findTool } from "../registry";
import type { PdfOptions } from "./engine";

const meta = findTool("merge-pdf");

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("merge-pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<PdfOptions["mode"]>("merge");
  const [pages, setPages] = useState("");

  return (
    <div>
      <Field
        label="What do you want to do"
        hint={
          mode === "merge"
            ? "Files join in the order shown below."
            : "Only the first file is used."
        }
      >
        {(id) => (
          <Select
            id={id}
            value={mode}
            onChange={(value) => setMode(value as PdfOptions["mode"])}
            options={[
              { value: "merge", label: "Join several files into one" },
              { value: "select", label: "Keep only some pages of one file" },
            ]}
          />
        )}
      </Field>

      <div className="mt-6">
        <Dropzone
          accept={meta?.accept}
          multiple={mode === "merge"}
          maxBytes={meta?.maxBytes}
          files={files}
          onChange={setFiles}
        />
      </div>

      {mode === "select" ? (
        <div className="mt-6">
          <Field
            label="Pages to keep"
            hint='Write them like a print dialogue: "1-3, 7, 9-". Leave it blank for every page.'
          >
            {(id) => (
              <TextInput
                id={id}
                value={pages}
                onChange={setPages}
                placeholder="1-3, 7"
              />
            )}
          </Field>
        </div>
      ) : null}

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={
            files.length === 0 || (mode === "merge" && files.length < 2)
          }
          onClick={() => run(files, { mode, pages })}
        >
          {mode === "merge" ? "Join the files" : "Take those pages"}
        </RunButton>
        {mode === "merge" && files.length === 1 ? (
          <p className="mt-2 text-sm text-slate-500">
            Add a second file to join, or switch to keeping some pages.
          </p>
        ) : null}
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
