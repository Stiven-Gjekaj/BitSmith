import type { RawImage } from "../../lib/image/codecs";
import { parsePageRange } from "../pdf-pages/engine";
/**
 * Draws the pages of a PDF, one at a time.
 *
 * This is the only module in the project that cannot run in Node, and it is
 * worth saying why rather than leaving somebody to discover it.
 *
 * Every other engine takes bytes and returns bytes with nothing in between
 * that a browser has to provide, which is what lets vitest run them against a
 * fixture. A PDF page is not data that can be converted; it is a program that
 * has to be drawn, and drawing needs a canvas. OffscreenCanvas exists inside
 * a Web Worker, so the work still stays off the main thread, but no amount of
 * arranging makes this testable without a browser. Playwright covers it
 * instead.
 *
 * The pure part is kept in pack.ts, which Node does test.
 */

/**
 * Each page is handed over as it is finished rather than collected.
 *
 * This is not tidiness. An A4 page at 200 dots per inch is about 1654 by 2339
 * pixels, which is 15 MB of raw colour. Fifty of those held in a list at once
 * is 750 MB, and a phone gives up long before that. The caller encodes each
 * page and lets it go before the next one is drawn.
 */
export type PageHandler = (
  image: RawImage,
  index: number,
  total: number,
) => Promise<void>;

export interface RasteriseOptions {
  /** Dots per inch. A PDF measures in points, of which there are 72 to one. */
  dpi: number;
  /** A ceiling on pages, so a 400 page document says no rather than hangs. */
  maxPages: number;
  pages: string;
}

export async function rasterise(
  bytes: Uint8Array,
  options: RasteriseOptions,
  onPage: PageHandler,
): Promise<number> {
  const pdfjs = await import("pdfjs-dist");

  // pdfjs runs its parser in a worker of its own, and it has to be told
  // where that file is.
  //
  // An empty string was tried first and is not the way to turn the worker
  // off: pdfjs waits for a worker that can never arrive, and the tool sits
  // there for ever with no error of any kind. Vite is asked for the real
  // address instead, so the file is built and served alongside everything
  // else rather than fetched from another site.
  const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

  const base = import.meta.env.BASE_URL;
  const task = pdfjs.getDocument({
    data: bytes,
    // Both of these are folders this site serves, copied in at build time. A
    // document that uses a standard font it did not embed renders blank
    // without them, and reports no error at all.
    standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
    cMapUrl: `${base}pdfjs/cmaps/`,
    cMapPacked: true,
  });

  const document = await task.promise;
  try {
    const total = document.numPages;
    const pageIndexes = parsePageRange(options.pages, total);

    if (pageIndexes.length > options.maxPages) {
      throw new Error(
        `You selected ${pageIndexes.length} pages, and this tool stops at ` +
          `${options.maxPages}.`,
      );
    }

    const scale = options.dpi / 72;
    for (const index of pageIndexes) {
      const number = index + 1;
      const page = await document.getPage(number);
      try {
        const viewport = page.getViewport({ scale });
        const width = Math.max(1, Math.floor(viewport.width));
        const height = Math.max(1, Math.floor(viewport.height));

        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error(
            "This browser will not give a drawing surface, so a PDF cannot " +
              "be turned into pictures here.",
          );
        }

        // A PDF page is transparent where nothing is drawn, and a transparent
        // JPEG is black. White is what the page looks like on paper.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        await page.render({
          canvas: canvas as unknown as HTMLCanvasElement,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;

        const drawn = context.getImageData(0, 0, width, height);
        await onPage(
          {
            data: drawn.data,
            width: drawn.width,
            height: drawn.height,
          },
          index,
          total,
        );
      } finally {
        // Lets go of the page's own buffers before the next one is drawn.
        page.cleanup();
      }
    }

    return pageIndexes.length;
  } finally {
    // The loading task owns the document, so it is the thing to shut down.
    await task.destroy();
  }
}
