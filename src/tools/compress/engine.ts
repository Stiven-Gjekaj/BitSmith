import {
  decode,
  type EncodableFormat,
  EXTENSION,
  encode,
  MIME,
} from "../../lib/image/codecs";
import { type Engine, withExtension } from "../../lib/pipeline/types";
import { searchQuality } from "./search";

/**
 * The formats worth offering here, and the one that is missing.
 *
 * PNG is not on this list, and cannot be. It is lossless, so quality does
 * nothing to it and there is no lever for the search to pull. A PNG that is
 * too large is made smaller by turning it into one of these, which is what a
 * visitor who dropped a PNG here is going to be told.
 *
 * AVIF is here but it is slow. Each probe is a full encode, and eight of them
 * on a large photograph is a long wait, so the search is given a smaller
 * budget for it.
 */
export type CompressFormat = Extract<EncodableFormat, "jpeg" | "webp" | "avif">;

export interface CompressOptions {
  targetBytes: number;
  format: CompressFormat;
}

export const DEFAULTS: CompressOptions = {
  targetBytes: 500 * 1024,
  format: "jpeg",
};

/** AVIF encodes far slower than the other two, so it gets fewer tries. */
const PROBE_BUDGET: Record<CompressFormat, number> = {
  jpeg: 8,
  webp: 8,
  avif: 5,
};

export const run: Engine<CompressOptions> = async (
  files,
  options,
  onProgress,
) => {
  if (files.length === 0) {
    throw new Error("Choose a picture first.");
  }
  if (options.targetBytes <= 0) {
    throw new Error("Ask for a size larger than nothing.");
  }

  const results = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const start = index / files.length;
    const share = 1 / files.length;

    onProgress(start, `Reading ${file.name}`);
    const image = await decode(file.bytes);
    const alreadyFits = file.bytes.length <= options.targetBytes;
    const attempt = alreadyFits
      ? {
          bytes: await encode(image, options.format, 100),
          quality: 100,
          probes: 1,
        }
      : await searchQuality(
          (quality) => encode(image, options.format, quality),
          options.targetBytes,
          {
            maxProbes: PROBE_BUDGET[options.format],
            onProbe: (done, of) => {
              onProgress(
                start + share * (0.1 + 0.85 * (done / of)),
                `Trying quality ${done} of at most ${of}`,
              );
            },
          },
        );

    if (!attempt) {
      // The smallest this format can reach is reported, so the message says
      // what to ask for instead rather than only that the answer was no.
      const smallest = await encode(image, options.format, 10);
      throw new Error(
        `${file.name} cannot reach ${readable(options.targetBytes)} as ` +
          `${options.format.toUpperCase()}. The smallest this format gets it ` +
          `is ${readable(smallest.length)}. Ask for that or more, or make the ` +
          "picture smaller first with the crop tool.",
      );
    }

    results.push({
      name: withExtension(file.name, EXTENSION[options.format]),
      type: MIME[options.format],
      bytes: attempt.bytes,
      note: alreadyFits
        ? `${readable(file.bytes.length)} in, ` +
          `already within the requested ${readable(options.targetBytes)} limit; ` +
          `delivered at best quality.`
        : `${readable(file.bytes.length)} in, ` +
          `${readable(attempt.bytes.length)} out at quality ${attempt.quality}, ` +
          `which is what was asked for.`,
    });
  }

  onProgress(1, "Done");
  return results;
};

/** The same shape of number the result panel shows, so the two agree. */
function readable(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}
