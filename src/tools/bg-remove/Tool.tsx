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
// ours.
const MODEL_URL = `${import.meta.env.BASE_URL}models/u2netp-fp16.onnx`;

export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("remove-background");
  const [files, setFiles] = useState<File[]>([]);
  const [backend, setBackend] = useState<string | null>(null);

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
      .then((note) => {
        if (!cancelled) setBackend(note ?? "processor");
      })
      .catch(() => {
        // A failure here is not worth an alarm. The run will fetch the model
        // itself and report a real error if it cannot.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = backend !== null;

  return (
    <div>
      <Dropzone
        accept={meta?.accept}
        maxBytes={meta?.maxBytes}
        files={files}
        onChange={setFiles}
      />

      <p className="alert alert-quiet" style={{ marginTop: 16 }}>
        {!ready
          ? "The model is downloading, about 2 MB, while you choose a photograph."
          : backend === "webgpu"
            ? "The model is loaded and running on your graphics card, which is the fast path."
            : "The model is loaded and running on your processor. This browser offers no graphics adapter, so a photograph takes a few seconds."}{" "}
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
