import { useState } from "react";
import { Dropzone } from "../../components/shell/Dropzone";
import { RunButton } from "../../components/shell/fields";
import { RunPanel } from "../../components/shell/RunPanel";
import { useToolRun } from "../../components/shell/useToolRun";
import { findTool } from "../registry";

const meta = findTool("strip-metadata");

/**
 * The one tool here with nothing to choose.
 *
 * There is no quality, no format, and no output setting, because the file
 * that comes back is the file that went in with parts removed. Adding a
 * format control would mean rebuilding the picture, which is the one thing
 * this tool must never do.
 */
export default function Tool() {
  const { state, run, reset, resultRef } = useToolRun("strip-metadata");
  const [files, setFiles] = useState<File[]>([]);

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
        JPEG, PNG and WebP. The camera, the date, and the place are removed. Two
        things stay, because dropping either would change how the picture looks:
        the colour profile, and the tag that says which way up a photograph was
        taken. The picture itself is never rebuilt, so it loses no quality at
        all.
      </p>

      <div className="mt-6">
        <RunButton
          busy={state.busy}
          disabled={files.length === 0}
          onClick={() => run(files, {})}
        >
          Clean {files.length > 1 ? `${files.length} pictures` : "the picture"}
        </RunButton>
      </div>

      <RunPanel state={state} resultRef={resultRef} onReset={reset} />
    </div>
  );
}
