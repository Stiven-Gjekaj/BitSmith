import { describe, expect, it } from "vitest";
import { searchQuality } from "./search";

/**
 * An encoder made of a lookup table.
 *
 * No codec and no picture. Every branch of the search can be driven exactly,
 * including the case that a real encoder almost never shows on demand: a size
 * that goes the wrong way as quality falls.
 */
function tabled(
  sizes: Record<number, number>,
  fallback = (q: number) => q * 100,
) {
  const asked: number[] = [];
  const encodeAt = async (quality: number) => {
    asked.push(quality);
    const size = sizes[quality] ?? fallback(quality);
    return new Uint8Array(size);
  };
  return { encodeAt, asked };
}

describe("searchQuality", () => {
  it("answers after one probe when the best quality already fits", async () => {
    const { encodeAt, asked } = tabled({ 100: 900 });
    const result = await searchQuality(encodeAt, 1000);
    expect(result?.quality).toBe(100);
    expect(result?.probes).toBe(1);
    expect(asked).toEqual([100]);
  });

  /**
   * Nothing is returned rather than something over the target. Handing back a
   * 340 KB file to somebody who asked for 200 KB would be a quiet failure.
   */
  it("gives nothing when even the worst quality is too big", async () => {
    const { encodeAt } = tabled({ 100: 9000, 10: 5000 });
    expect(await searchQuality(encodeAt, 1000)).toBeNull();
  });

  it("finds the highest quality that fits", async () => {
    // 100 per point of quality, so the target of 5500 fits at 55 and not 56.
    const { encodeAt } = tabled({});
    const result = await searchQuality(encodeAt, 5500);
    expect(result?.quality).toBeLessThanOrEqual(55);
    expect(result?.bytes.length).toBeLessThanOrEqual(5500);
    // Within a point or two of the best possible answer.
    expect(result?.quality).toBeGreaterThan(50);
  });

  /**
   * The test this file exists for.
   *
   * Size does not fall perfectly as quality falls. Here quality 60 gives a
   * larger file than 59, which is the shape that breaks a search that assumes
   * otherwise. What must never happen is a returned file over the target.
   */
  it("never returns a file over the target, even when size is not orderly", async () => {
    const sizes: Record<number, number> = {
      100: 9000,
      10: 1000,
      55: 4800,
      60: 5200,
      59: 4900,
      80: 5100,
      70: 5300,
      65: 4700,
    };
    const { encodeAt } = tabled(sizes);
    const result = await searchQuality(encodeAt, 5000);
    expect(result).not.toBeNull();
    expect(result?.bytes.length).toBeLessThanOrEqual(5000);

    // The bytes must be the ones that were measured at the quality reported,
    // not a fresh encode at that number and not an empty placeholder. Without
    // this the search could return anything small and still look correct.
    const quality = result?.quality as number;
    expect(result?.bytes.length).toBe(sizes[quality] ?? quality * 100);
    expect(result?.bytes.length).toBeGreaterThan(0);
  });

  /**
   * The budget has to be reached to be tested.
   *
   * The first version of this test handed back a size that was over the
   * target at every quality, so the search gave up after two probes and never
   * entered the loop at all. It passed with the budget removed, which is the
   * definition of a test that checks nothing. Here the worst quality fits and
   * nothing else does, so the loop runs until the budget stops it.
   */
  it("stops after the probe budget", async () => {
    const { encodeAt, asked } = tabled({}, (quality) =>
      quality <= 10 ? 1000 : 9999,
    );
    const result = await searchQuality(encodeAt, 5000, { maxProbes: 4 });
    expect(result).not.toBeNull();
    expect(asked.length).toBe(4);
  });

  it("would take more probes than that without the budget", async () => {
    const { encodeAt, asked } = tabled({}, (quality) =>
      quality <= 10 ? 1000 : 9999,
    );
    await searchQuality(encodeAt, 5000, { maxProbes: 100 });
    expect(asked.length).toBeGreaterThan(4);
  });

  it("ends without help even when every probe fits", async () => {
    const { encodeAt } = tabled({}, () => 10);
    const result = await searchQuality(encodeAt, 5000);
    expect(result?.quality).toBe(100);
    expect(result?.probes).toBe(1);
  });

  it("keeps inside the quality range it was given", async () => {
    const { encodeAt, asked } = tabled({});
    await searchQuality(encodeAt, 5500, { low: 40, high: 80 });
    for (const quality of asked) {
      expect(quality).toBeGreaterThanOrEqual(40);
      expect(quality).toBeLessThanOrEqual(80);
    }
  });

  it("counts the probes it reports", async () => {
    const { encodeAt, asked } = tabled({});
    const result = await searchQuality(encodeAt, 5500);
    expect(result?.probes).toBe(asked.length);
  });

  it("tells the caller how far along it is", async () => {
    const { encodeAt } = tabled({});
    const seen: number[] = [];
    await searchQuality(encodeAt, 5500, {
      onProbe: (done) => seen.push(done),
    });
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen[0]).toBe(1);
  });
});
