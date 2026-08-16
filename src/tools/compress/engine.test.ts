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

  it("says what it asked for and what it delivered", async () => {
    const [result] = await run(
      [file("holiday.png")],
      { targetBytes: 1200, format: "jpeg" },
      () => {},
    );
    expect(result.note).toMatch(/Asked for/);
    expect(result.note).toMatch(/quality \d+/);
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

  it("takes a generous target in one probe", async () => {
    const probes: string[] = [];
    await run(
      [file("a.png")],
      { targetBytes: 5 * 1024 * 1024, format: "jpeg" },
      (_value, label) => {
        if (label) probes.push(label);
      },
    );
    // Only the read and the finish. A search that ran anyway would add more.
    expect(probes.filter((label) => label.startsWith("Trying"))).toHaveLength(
      1,
    );
  });
});
