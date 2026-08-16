import {
  type EncodableFormat,
  EXTENSION,
  encode,
  MIME,
  type RawImage,
} from "../../lib/image/codecs";
import type { EngineResult } from "../../lib/pipeline/types";

/**
 * Turns one rasterised page into one finished file.
 *
 * Kept apart from the rasteriser on purpose. Drawing a PDF page needs a
 * canvas and cannot happen in Node, but naming and encoding the result can,
 * and that is where the mistakes live: an off by one in a page number, a
 * wrong extension, or a sort order that puts page 10 before page 9.
 */
export function packPage(
  image: RawImage,
  options: {
    index: number;
    total: number;
    format: EncodableFormat;
    quality: number;
    sourceName: string;
  },
): Promise<EngineResult> {
  const { index, total, format, quality, sourceName } = options;
  return encode(image, format, quality).then((bytes) => ({
    name: `${baseOf(sourceName)}-page-${numbered(index + 1, total)}.${EXTENSION[format]}`,
    type: MIME[format],
    bytes,
  }));
}

/**
 * Pads the number so the files sort the way the document reads.
 *
 * Without this a folder of twelve pages lists page 10 straight after page 1,
 * which is the sort of thing nobody checks and everybody notices when they
 * print the result.
 */
function numbered(page: number, total: number): string {
  return String(page).padStart(String(total).length, "0");
}

function baseOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}
