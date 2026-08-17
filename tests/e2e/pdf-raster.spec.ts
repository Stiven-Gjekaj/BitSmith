import { PDFDocument, rgb } from "pdf-lib";
import { expect, test } from "@playwright/test";
import { resultBytes, runAndWait, sniff, toolReady } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./pdf-to-image/");
});

test("will not run without a document", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /Turn the pages into pictures/ }),
  ).toBeDisabled();
});

test("gives one picture for each page, numbered in order", async ({ page }) => {
  test.setTimeout(120_000);
  await give(page, await madeOf(3));

  await runAndWait(page, /Turn the pages into pictures/);

  const links = page.locator("a[download]");
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute("download", "report-page-1.png");
  await expect(links.nth(2)).toHaveAttribute("download", "report-page-3.png");
  expect(sniff(await resultBytes(page))).toBe("png");
});


test("converts only the pages in the requested range", async ({ page }) => {
  test.setTimeout(120_000);
  await give(page, await madeOf(6));

  await page.getByLabel("Pages").fill("2-4");

  await runAndWait(page, /Turn the pages into pictures/);

  const links = page.locator("a[download]");

  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute(
    "download",
    "report-page-2.png",
  );
  await expect(links.nth(1)).toHaveAttribute(
    "download",
    "report-page-3.png",
  );
  await expect(links.nth(2)).toHaveAttribute(
    "download",
    "report-page-4.png",
  );
});

/**
 * Proves that a page of text really arrives as a page of text.
 *
 * A rasteriser that produced a blank white picture would pass every other
 * test here: the file count, the names, and the format would all be right,
 * and nothing on the page would look wrong. Counting the dark pixels is the
 * only assertion a blank page cannot pass.
 *
 * What this does not prove is worth writing down, because it was written to
 * prove it and does not. Pointing standardFontDataUrl at a folder that does
 * not exist was measured and this test still passed: pdfjs draws the fourteen
 * standard fonts without fetching anything. So the copied font folder is not
 * what keeps this page readable, and its value is for documents this test
 * does not cover, such as text that is not Latin.
 */
test("really draws the text on the page", async ({ page }) => {
  test.setTimeout(120_000);
  await give(page, withUnembeddedFont());

  await runAndWait(page, /Turn the pages into pictures/);

  const bytes = await resultBytes(page);
  const dark = await countDarkPixels(page, bytes);
  // A page of large black text covers a good deal more than a handful of
  // pixels. A blank page covers none.
  expect(dark).toBeGreaterThan(500);
});

test("refuses something that is not a PDF", async ({ page }) => {
  await toolReady(page);
  await page.setInputFiles('input[type="file"]', {
    name: "notes.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("this is not a document"),
  });
  await page.getByRole("button", { name: /Turn the pages/ }).click();
  await expect(page.getByText(/is not a PDF/)).toBeVisible();
});

async function give(page: import("@playwright/test").Page, bytes: Uint8Array) {
  await toolReady(page);
  await page.setInputFiles('input[type="file"]', {
    name: "report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
}

/** A document of the given length, each page carrying a drawn shape. */
async function madeOf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let at = 0; at < pages; at += 1) {
    const page = pdf.addPage([300, 400]);
    page.drawRectangle({
      x: 40,
      y: 40,
      width: 220,
      height: 320,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  return pdf.save();
}

/**
 * A document that names a standard font and does not embed it.
 *
 * Written by hand, and it has to be. pdf-lib embeds Helvetica when asked for
 * it, despite the name, so a document built with pdf-lib carries its own font
 * and never asks pdfjs for one. The first version of this test used pdf-lib
 * and passed with the font folder pointed at a directory that does not exist,
 * which is precisely the failure it was written to catch.
 *
 * Naming the font without embedding it is what a word processor does, and it
 * is why the folder has to be served.
 */
function withUnembeddedFont(): Uint8Array {
  const content = "BT /F1 48 Tf 20 90 Td (HELLO) Tj ET\n";
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]" +
      "/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${content.length}>>stream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj${body}endobj\n`;
  });

  const startxref = pdf.length;
  // Every entry in the table is exactly twenty bytes, which is what lets a
  // reader jump straight to the one it wants.
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\n`;
  pdf += `startxref\n${startxref}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

/** Counts how many pixels are dark, by decoding the PNG in the browser. */
async function countDarkPixels(
  page: import("@playwright/test").Page,
  bytes: Uint8Array,
): Promise<number> {
  return page.evaluate(async (data) => {
    const blob = new Blob([new Uint8Array(data)], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) return 0;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let dark = 0;
    for (let at = 0; at < pixels.length; at += 4) {
      if (pixels[at] < 100 && pixels[at + 1] < 100 && pixels[at + 2] < 100) {
        dark += 1;
      }
    }
    return dark;
  }, Array.from(bytes));
}
