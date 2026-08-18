import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULTS, run } from "./engine";

const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
const file = (name: string) => ({ name, bytes: png, type: "image/png" });

describe("the compress engine", () => {
  it("refuses an empty list", async () => {
    await expect(run([], { ...DEFAULTS }, () => {})).rejects.toThrow(
      /Choose a picture/,
    );
  });

  it("refuses a target of nothing", async () => {
    await expect(
      run([file("a.png")], { targetBytes: 0, format: "jpeg" }, () => {}),
    ).rejects.toThrow(/larger than nothing/);
  });

  /**
   * The assertion that matters to the person using this. Whatever the search
   * did inside, the file that arrives must fit what was asked for.
   */
  it("delivers a file inside the size asked for", async () => {
    const target = 1200;
    const [result] = await run(
      [file("holiday.png")],
      { targetBytes: target, format: "jpeg" },
      () => {},
    );
    expect(result.bytes.length).toBeLessThanOrEqual(target);
    expect(result.name).toBe("holiday.jpg");
  });

  it("reports the input size, output size, and quality", async () => {
    const target = 1200;

    const [result] = await run(
      [file("holiday.png")],
      { targetBytes: target, format: "jpeg" },
      () => {},
    );

    expect(result.note).toMatch(
      new RegExp(
        `^${Math.round(png.length / 1024)} KB in, ` +
          `${Math.round(result.bytes.length / 1024)} KB out at ` +
          `quality \\d+, which is what was asked for\\.$`,
      ),
    );
  });

  it("says when the picture already fits", async () => {
    const target = 5 * 1024;

    const [result] = await run(
      [file("small.png")],
      { targetBytes: target, format: "jpeg" },
      () => {},
    );

    expect(result.note).toBe(
      `${Math.round(png.length / 1024)} KB in, ` +
        `already within the requested ${Math.round(target / 1024)} KB limit; ` +
        `delivered at best quality.`,
    );
  });
  /**
   * An impossible target says so, and says what is possible. A message that
   * only refused would leave the visitor guessing what to type next.
   */
  it("names a reachable size when the target cannot be met", async () => {
    await expect(
      run([file("holiday.png")], { targetBytes: 12, format: "jpeg" }, () => {}),
    ).rejects.toThrow(/smallest this format gets it is/);
  });

  it("writes each format it offers", async () => {
    for (const format of ["jpeg", "webp", "avif"] as const) {
      const [result] = await run(
        [file("holiday.png")],
        { targetBytes: 4000, format },
        () => {},
      );
      expect(result.bytes.length, format).toBeLessThanOrEqual(4000);
    }
  });

  it("reports progress that only goes forward and ends at one", async () => {
    const seen: number[] = [];
    await run([file("a.png"), file("b.png")], { ...DEFAULTS }, (value) =>
      seen.push(value),
    );
    expect(seen[seen.length - 1]).toBe(1);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it("does not search when the input already fits", async () => {
    const probes: string[] = [];

    await run(
      [file("a.png")],
      { targetBytes: 5 * 1024 * 1024, format: "jpeg" },
      (_value, label) => {
        if (label) probes.push(label);
      },
    );

    expect(probes.filter((label) => label.startsWith("Trying"))).toHaveLength(
      0,
    );
  });
});
