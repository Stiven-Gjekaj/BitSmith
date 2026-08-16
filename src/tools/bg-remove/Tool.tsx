import { useEffect, useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { RunButton } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { prepareTool } from "../../lib/pipeline/runTool";
import { findTool } from "../registry";
import { requestIsolation } from "./isolate";

const meta = findTool("remove-background");

// The model is served from this site, and not from somebody else's. The site
// must keep working if a third party goes away, and the cache headers must be
// ours. Section 6 of docs/plan.md records that rule.
const MODEL_URL = `${import.meta.env.BASE_URL}models/u2netp.onnx`;

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("remove-background");
  const [files, setFiles] = useState<File[]>([]);
  const [ready, setReady] = useState(false);
  const [cores, setCores] = useState(1);

  // Start the download as the page opens, rather than when the button is
  // pressed. The visitor then spends that time choosing a photograph, which is
  // time they were going to spend anyway.
  useEffect(() => {
    let cancelled = false;
    // Ask for isolation first. It may reload the page once, and starting a
    // 4 MB download that the reload throws away would waste the visitor's
    // connection.
    requestIsolation()
      .then((state) => {
        if (cancelled || state === "reloading") return null;
        setCores(self.crossOriginIsolated ? navigator.hardwareConcurrency : 1);
        return prepareTool("remove-background", { modelUrl: MODEL_URL });
      })
      .then((started) => {
        if (!cancelled && started !== null) setReady(true);
      })
      .catch(() => {
        // A failure here is not worth an alarm. The run will fetch the model
        // itself and report a real error if it cannot.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {ready
          ? `The model is loaded and stays loaded${cores > 1 ? `, and it runs on ${cores} cores` : ""}.`
          : "The model is downloading in the background while you choose a photograph."}{" "}
        It runs on your device, so the photograph is never sent anywhere.
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
