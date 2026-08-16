import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { decode, encode } from "../../lib/image/codecs";
import { DEFAULTS, run } from "./engine";

const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
const jpg = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));
const heic = new Uint8Array(readFileSync("tests/fixtures/gradient.heic"));

const file = (name: string, bytes: Uint8Array) => ({
  name,
  bytes,
  type: "application/octet-stream",
});

describe("the image to PDF engine", () => {
  it("refuses an empty list", async () => {
    await expect(run([], { ...DEFAULTS }, () => {})).rejects.toThrow(
      /at least one picture/,
    );
  });

  it("writes something that really is a PDF", async () => {
    const [result] = await run([file("a.png", png)], { ...DEFAULTS }, () => {});
    expect(String.fromCharCode(...result.bytes.subarray(0, 5))).toBe("%PDF-");
    expect(result.type).toBe("application/pdf");
    expect(result.name).toBe("a.pdf");
  });

  it("gives one page for each picture, in one file", async () => {
    const results = await run(
      [file("a.png", png), file("b.jpg", jpg), file("c.png", png)],
      { ...DEFAULTS },
      () => {},
    );
    expect(results).toHaveLength(1);
    const pdf = await PDFDocument.load(results[0].bytes);
    expect(pdf.getPageCount()).toBe(3);
  });

  it("cuts pages to A4 when asked", async () => {
    const [result] = await run(
      [file("a.png", png)],
      { paper: "a4", margin: 36 },
      () => {},
    );
    const pdf = await PDFDocument.load(result.bytes);
    const page = pdf.getPage(0);
    expect(Math.round(page.getWidth())).toBe(595);
    expect(Math.round(page.getHeight())).toBe(842);
  });

  it("cuts a page to the picture when asked", async () => {
    const [result] = await run(
      [file("a.png", png)],
      { paper: "picture", margin: 0 },
      () => {},
    );
    const pdf = await PDFDocument.load(result.bytes);
    const page = pdf.getPage(0);
    // The fixture is 64 by 48.
    expect(Math.round(page.getWidth())).toBe(64);
    expect(Math.round(page.getHeight())).toBe(48);
  });

  /**
   * The reason a JPEG takes its own path.
   *
   * pdf-lib can hold JPEG bytes as they are, so a photograph keeps the exact
   * compression it arrived with. Decoding and re-encoding it would put it
   * through a second lossy pass for no reason, and the only way to tell the
   * two apart from outside is that the original bytes are still in the file.
   */
  it("puts a JPEG in without recompressing it", async () => {
    const [result] = await run([file("a.jpg", jpg)], { ...DEFAULTS }, () => {});
    // The scan data of the source appears verbatim inside the document.
    const marker = jpg.subarray(jpg.length - 64);
    expect(Buffer.from(result.bytes).includes(Buffer.from(marker))).toBe(true);
  });

  it("turns the formats a PDF cannot hold into ones it can", async () => {
    const webp = await encode(await decode(png), "webp", 80);
    const [result] = await run(
      [file("a.webp", webp), file("b.heic", heic)],
      { ...DEFAULTS },
      () => {},
    );
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(2);
  });

  it("refuses something that is not a picture", async () => {
    const notAPicture = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    await expect(
      run([file("x.bin", notAPicture)], { ...DEFAULTS }, () => {}),
    ).rejects.toThrow(/not a picture/);
  });

  it("says how many pictures went in when there was more than one", async () => {
    const [one] = await run([file("a.png", png)], { ...DEFAULTS }, () => {});
    expect(one.note).toBeUndefined();

    const [many] = await run(
      [file("a.png", png), file("b.png", png)],
      { ...DEFAULTS },
      () => {},
    );
    expect(many.note).toMatch(/2 pictures/);
  });

  it("reports progress that only goes forward and ends at one", async () => {
    const seen: number[] = [];
    await run([file("a.png", png), file("b.png", png)], { ...DEFAULTS }, (v) =>
      seen.push(v),
    );
    expect(seen[seen.length - 1]).toBe(1);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});
