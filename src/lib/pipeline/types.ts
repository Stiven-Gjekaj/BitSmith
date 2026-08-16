/**
 * The contract between the shell and every tool engine.
 *
 * An engine takes bytes, reports progress, and returns bytes. It touches no
 * browser API and no React, which is the only reason a test can run it in
 * Node against a fixture file.
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
