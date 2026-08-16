import { PDFDocument } from "pdf-lib";
import { type Engine, withExtension } from "../../lib/pipeline/types";

export interface PdfOptions {
  mode: "merge" | "select";
  /** Which pages to keep, in the "select" mode. For example "1-3, 7, 9-". */
  pages: string;
}

export const DEFAULTS: PdfOptions = { mode: "merge", pages: "" };

/**
 * Reads a page range written the way a print dialogue accepts one.
 *
 * Returns zero-based indexes, in the order the visitor asked for, with
 * duplicates removed. An empty range means every page, because that is the
 * least surprising reading of an empty box.
 *
 * This is separate from the engine so that a test can check the parsing on its
 * own, without building a PDF first.
 */
export function parsePageRange(input: string, pageCount: number): number[] {
  const text = input.trim();
  if (text === "") {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const wanted: number[] = [];

  for (const part of text.split(",")) {
    const piece = part.trim();
    if (piece === "") {
      continue;
    }

    const match = piece.match(/^(\d+)?\s*-\s*(\d+)?$/);
    if (match) {
      const from = match[1] ? Number(match[1]) : 1;
      const to = match[2] ? Number(match[2]) : pageCount;
      const step = from <= to ? 1 : -1;
      for (let page = from; step > 0 ? page <= to : page >= to; page += step) {
        wanted.push(page - 1);
      }
      continue;
    }

    if (/^\d+$/.test(piece)) {
      wanted.push(Number(piece) - 1);
      continue;
    }

    throw new Error(
      `"${piece}" is not a page or a range. Write pages like "1-3, 7".`,
    );
  }

  const inRange = wanted.filter((index) => index >= 0 && index < pageCount);
  if (inRange.length === 0) {
    throw new Error(
      `That range picks no page. This file has ${pageCount} ` +
        `${pageCount === 1 ? "page" : "pages"}.`,
    );
  }

  return [...new Set(inRange)];
}

export const run: Engine<PdfOptions> = async (files, options, onProgress) => {
  if (files.length === 0) {
    throw new Error("Choose at least one PDF file first.");
  }

  const output = await PDFDocument.create();

  if (options.mode === "merge") {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      onProgress(0.1 + (index / files.length) * 0.8, `Reading ${file.name}`);

      const source = await PDFDocument.load(file.bytes, {
        ignoreEncryption: true,
      });
      const copied = await output.copyPages(source, source.getPageIndices());
      for (const page of copied) {
        output.addPage(page);
      }
    }
  } else {
    const file = files[0];
    onProgress(0.2, `Reading ${file.name}`);

    const source = await PDFDocument.load(file.bytes, {
      ignoreEncryption: true,
    });
    const indexes = parsePageRange(options.pages, source.getPageCount());

    onProgress(0.6, "Taking the pages you asked for");
    const copied = await output.copyPages(source, indexes);
    for (const page of copied) {
      output.addPage(page);
    }
  }

  onProgress(0.9, "Writing the file");
  const bytes = await output.save();

  const name =
    options.mode === "merge" && files.length > 1
      ? "merged.pdf"
      : withExtension(files[0].name, "pdf").replace(/\.pdf$/, "-pages.pdf");

  return [{ name, type: "application/pdf", bytes: new Uint8Array(bytes) }];
};
