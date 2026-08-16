import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { EngineFile } from "../../lib/pipeline/types";
import { parsePageRange, run } from "./engine";

/**
 * Builds a PDF with a known page count inside the test.
 *
 * The state a test needs is built here and not read from a file the author
 * edits. AGENTS.md gives the reason: a test that reads the example
 * configuration fails when somebody changes that configuration, and the
 * failure says nothing about the code.
 */
async function makePdf(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage([200, 200]);
  }
  return document.save();
}

function asFile(name: string, bytes: Uint8Array): EngineFile {
  return { name, type: "application/pdf", bytes };
}

const silent = () => {};

describe("parsePageRange", () => {
  it("reads a single page as a zero based index", () => {
    expect(parsePageRange("1", 5)).toEqual([0]);
  });

  it("reads a closed range", () => {
    expect(parsePageRange("2-4", 10)).toEqual([1, 2, 3]);
  });

  it("reads an open range as running to the last page", () => {
    expect(parsePageRange("3-", 5)).toEqual([2, 3, 4]);
  });

  it("keeps the order the visitor asked for", () => {
    expect(parsePageRange("3,1", 5)).toEqual([2, 0]);
  });

  it("removes a page named twice", () => {
    expect(parsePageRange("1,1-2", 5)).toEqual([0, 1]);
  });

  it("treats an empty range as every page", () => {
    expect(parsePageRange("  ", 3)).toEqual([0, 1, 2]);
  });

  it("drops a page beyond the end rather than inventing one", () => {
    expect(parsePageRange("1,99", 2)).toEqual([0]);
  });

  it("refuses a range that picks nothing", () => {
    expect(() => parsePageRange("50", 2)).toThrow(/picks no page/);
  });

  it("refuses text that is not a range", () => {
    expect(() => parsePageRange("last", 2)).toThrow(/not a page or a range/);
  });
});

describe("the PDF engine", () => {
  it("joins two files into one with every page", async () => {
    // Confirm the inputs really hold what the test claims, so that the
    // assertion below cannot pass because both files were empty.
    const a = await makePdf(2);
    const b = await makePdf(3);
    expect((await PDFDocument.load(a)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(b)).getPageCount()).toBe(3);

    const [result] = await run(
      [asFile("a.pdf", a), asFile("b.pdf", b)],
      { mode: "merge", pages: "" },
      silent,
    );

    expect(result.type).toBe("application/pdf");
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(5);
  });

  it("keeps only the pages that the range names", async () => {
    const source = await makePdf(6);
    expect((await PDFDocument.load(source)).getPageCount()).toBe(6);

    const [result] = await run(
      [asFile("long.pdf", source)],
      { mode: "select", pages: "2-3,6" },
      silent,
    );

    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(3);
  });

  it("refuses an empty file list with a message a visitor can act on", async () => {
    await expect(run([], { mode: "merge", pages: "" }, silent)).rejects.toThrow(
      /Choose at least one PDF/,
    );
  });
});
