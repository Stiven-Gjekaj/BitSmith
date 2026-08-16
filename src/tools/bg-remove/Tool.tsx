import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { RunButton } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { findTool } from "../registry";

const meta = findTool("remove-background");

// The model is served from this site, and not from somebody else's. The site
// must keep working if a third party goes away, and the cache headers must be
// ours. Section 6 of docs/plan.md records that rule.
const MODEL_URL = `${import.meta.env.BASE_URL}models/u2netp.onnx`;

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("remove-background");
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        The first run downloads a model of about 4 MB and then keeps it. The
        model runs on your device, so the photograph is never sent anywhere. A
        large picture takes a few seconds.
      </p>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0}
          onClick={() => run(files, { modelUrl: MODEL_URL })}
        >
          Remove the background
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
