import type { EncodableFormat } from "../../lib/image/codecs";
import type { Engine, EngineResult } from "../../lib/pipeline/types";
import { packPage } from "./pack";

export interface RasterOptions {
  dpi: number;
  format: EncodableFormat;
  quality: number;
  pages: string;
}

export const DEFAULTS: RasterOptions = {
  dpi: 150,
  format: "png",
  quality: 90,
  pages: "",
};

/** Above this the answer is to take the pages wanted out first. */
const MAX_PAGES = 60;

export const run: Engine<RasterOptions> = async (
  files,
  options,
  onProgress,
) => {
  const file = files[0];
  if (!file) {
    throw new Error("Choose a PDF first.");
  }
  if (String.fromCharCode(...file.bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error(`${file.name} is not a PDF.`);
  }

  onProgress(0.05, "Reading the document");

  // Loaded here rather than at the top of the file, because this is the one
  // module in the project that a browser has to run. Keeping the import
  // inside the function keeps pdfjs out of anything that only wants the
  // naming and encoding in pack.ts, which Node does test.
  const { rasterise } = await import("./rasterise");

  const results: EngineResult[] = [];
  await rasterise(
    file.bytes,
    { dpi: options.dpi, maxPages: MAX_PAGES, pages: options.pages },
    async (image, index, total) => {
      onProgress(
        0.05 + 0.9 * ((index + 1) / total),
        `Page ${index + 1} of ${total}`,
      );
      // Encoded and pushed here, so the raw page is released before the next
      // one is drawn. An A4 page at this size is megabytes of colour.
      results.push(
        await packPage(image, {
          index,
          total,
          format: options.format,
          quality: options.quality,
          sourceName: file.name,
        }),
      );
    },
  );

  onProgress(1, "Done");
  return results;
};
