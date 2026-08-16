import { useCallback, useRef, useState } from "react";
import { runTool } from "../../lib/pipeline/runTool";
import { type EngineResult, toEngineFile } from "../../lib/pipeline/types";
import { findTool } from "../../tools/registry";

export interface RunState {
  busy: boolean;
  fraction: number;
  message: string;
  error: string | null;
  results: EngineResult[] | null;
}

const IDLE: RunState = {
  busy: false,
  fraction: 0,
  message: "",
  error: null,
  results: null,
};

/**
 * Holds the state of one tool run.
 *
 * Every tool shares this, so progress, failure, and the result list behave the
 * same way on every page. A tool component only decides what its options are.
 */
export function useToolRun(slug: string) {
  const [state, setState] = useState<RunState>(IDLE);
  const resultRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => setState(IDLE), []);

  const run = useCallback(
    async (files: File[], options: Record<string, unknown>) => {
      setState({ ...IDLE, busy: true, message: "Reading the file" });

      try {
        const engineFiles = await Promise.all(files.map(toEngineFile));

        const results = await runTool(
          slug,
          engineFiles,
          options,
          (fraction, message) => {
            setState((previous) => ({
              ...previous,
              fraction,
              message: message ?? previous.message,
            }));
          },
          findTool(slug)?.reusesWorker ?? false,
        );

        setState({
          busy: false,
          fraction: 1,
          message: "Finished",
          error: null,
          results,
        });

        // Section 17 of the plan: move the focus to the result. A keyboard
        // user who cannot see the page otherwise has no idea the work is done.
        window.requestAnimationFrame(() => resultRef.current?.focus());
      } catch (error) {
        setState({
          ...IDLE,
          error:
            error instanceof Error
              ? error.message
              : "Something went wrong. Try a different file.",
        });
      }
    },
    [slug],
  );

  return { state, run, reset, resultRef };
}
