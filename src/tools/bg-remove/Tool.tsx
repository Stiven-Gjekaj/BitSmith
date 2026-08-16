import { useEffect, useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { RunButton } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { prepareTool } from "../../lib/pipeline/runTool";
import { findTool } from "../registry";

const meta = findTool("remove-background");

// The model is served from this site, and not from somebody else's. The site
// must keep working if a third party goes away, and the cache headers must be
// ours. Section 6 of docs/plan.md records that rule.
const MODEL_URL = `${import.meta.env.BASE_URL}models/u2netp.onnx`;

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("remove-background");
  const [files, setFiles] = useState<File[]>([]);
  const [ready, setReady] = useState(false);

  // Start the download as the page opens, rather than when the button is
  // pressed. The visitor then spends that time choosing a photograph, which is
  // time they were going to spend anyway.
  useEffect(() => {
    let cancelled = false;
    // Remove the isolation service worker that an earlier version registered.
    // It made the page cross-origin isolated, and onnxruntime hung when it
    // then tried to use threads. A visitor who loaded that version still has
    // the worker, so this takes it away rather than leaving them stuck.
    navigator.serviceWorker
      ?.getRegistrations()
      .then((all) =>
        Promise.all(
          all
            .filter((one) => one.scope.includes("/remove-background/"))
            .map((one) => one.unregister()),
        ),
      )
      .catch(() => {});

    prepareTool("remove-background", { modelUrl: MODEL_URL })
      .then(() => {
        if (!cancelled) setReady(true);
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
          ? "The model is loaded and stays loaded, so each photograph takes a few seconds rather than starting over."
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
