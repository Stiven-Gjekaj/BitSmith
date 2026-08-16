/**
 * Finds the highest quality that still fits inside a size.
 *
 * This knows nothing about pictures. It is handed a function that encodes at
 * a quality and returns bytes, which is what lets Node test every branch of
 * it against a table of made up sizes, with no codec and no fixture.
 */

export interface Attempt {
  bytes: Uint8Array;
  quality: number;
  /** How many times the encoder ran. Each one is slow on a large picture. */
  probes: number;
}

export async function searchQuality(
  encodeAt: (quality: number) => Promise<Uint8Array>,
  targetBytes: number,
  options: {
    low?: number;
    high?: number;
    maxProbes?: number;
    onProbe?: (done: number, of: number) => void;
  } = {},
): Promise<Attempt | null> {
  const { onProbe } = options;
  let low = options.low ?? 10;
  let high = options.high ?? 100;
  const maxProbes = options.maxProbes ?? 8;

  let probes = 0;
  const measure = async (quality: number) => {
    probes += 1;
    onProbe?.(probes, maxProbes);
    return { bytes: await encodeAt(quality), quality };
  };

  // The best quality first. A screenshot asked to fit in 500 KB is usually
  // already smaller than that, and answering without a search is both faster
  // and better than answering after one.
  const best = await measure(high);
  if (best.bytes.length <= targetBytes) {
    return { ...best, probes };
  }

  // The worst quality next. If even that does not fit, no quality will, and
  // saying so is better than returning something over the target.
  const worst = await measure(low);
  if (worst.bytes.length > targetBytes) {
    return null;
  }

  // Everything from here holds the bytes of a probe that actually fitted.
  //
  // Re-encoding at the final quality instead would look like the same thing
  // and is not. Size does not fall perfectly as quality falls: a JPEG at 71
  // can come out a few bytes larger than the same picture at 72. Keeping the
  // measured result means the answer is one that was seen to fit, rather than
  // one assumed to.
  let fitting = worst;

  while (high - low > 1 && probes < maxProbes) {
    // Strictly between the two, so the gap always shrinks and the loop always
    // ends, whatever the encoder does.
    const middle = (low + high) >> 1;
    const attempt = await measure(middle);
    if (attempt.bytes.length <= targetBytes) {
      fitting = attempt;
      low = middle;
    } else {
      high = middle;
    }
  }

  return { ...fitting, probes };
}
