/**
 * The contract between the shell and every tool engine.
 *
 * An engine takes bytes, reports progress, and returns bytes, and never
 * touches React. Almost all of them touch no browser API either, which is the
 * reason a test can run them in Node against a fixture file.
 *
 * Two are exceptions, and both say so at the top of their own files. The
 * background remover fetches a model. The PDF rasteriser needs a canvas,
 * because a PDF page is not data to be converted but a program to be drawn.
 * Both keep their pure part in a separate module that Node does test, and
 * Playwright covers the rest. This comment used to say that no engine touched
 * a browser API, which stopped being true and misled a reader into planning
 * around a rule the code no longer held.
 *
 * The same shape works for a Web Worker and for a network call, so a tool
 * that needs a server can arrive later without changing the shell.
 */

/** A file on its way into an engine. */
export interface EngineFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

/** A file on its way out of an engine. */
export interface EngineResult {
  name: string;
  type: string;
  bytes: Uint8Array;
  /**
   * One line about what happened to this file, when the size cannot say it.
   *
   * Removing metadata is the case that needs this. A file that carried none
   * comes back the same size as one whose metadata was removed but was small,
   * and the number on screen cannot tell those apart. Most engines leave this
   * out, and nothing is shown when they do.
   */
  note?: string;
}

/**
 * Reports how far the work has gone.
 *
 * `fraction` runs from 0 to 1. A step that cannot measure itself reports the
 * fraction it starts at, and gives a message instead.
 */
export type ProgressReporter = (fraction: number, message?: string) => void;

/** Every engine has this signature. */
export type Engine<Options = Record<string, unknown>> = (
  files: EngineFile[],
  options: Options,
  onProgress: ProgressReporter,
) => Promise<EngineResult[]>;

/** Turns a browser File into the shape an engine reads. */
export async function toEngineFile(file: File): Promise<EngineFile> {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name,
    type: file.type,
    bytes: new Uint8Array(buffer),
  };
}

/** Replaces the extension on a file name, keeping the rest. */
export function withExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem}.${extension}`;
}
