import { PDFDocument } from "pdf-lib";
import { expect, test } from "@playwright/test";
import {
  giveImage,
  giveImages,
  resultBytes,
  resultName,
  runAndWait,
  sniff,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./image-to-pdf/");
});

test("will not run without a picture", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Make a PDF/ })).toBeDisabled();
});

test("turns one picture into a PDF", async ({ page }) => {
  await giveImage(page, "receipt.png");

  await runAndWait(page, /Make a PDF/);

  expect(await resultName(page)).toBe("receipt.pdf");
  expect(sniff(await resultBytes(page))).toBe("pdf");
});

/**
 * Several pictures give one file, not several. The page count is read out of
 * the finished document, because a PDF with the wrong number of pages is
 * still a valid PDF and nothing on the page would look wrong.
 */
test("puts several pictures into one file, a page each", async ({ page }) => {
  await giveImages(page, ["one.png", "two.png", "three.png"]);

  await runAndWait(page, /Make a PDF from 3 pictures/);

  await expect(page.locator("a[download]")).toHaveCount(1);
  // Read with a real parser rather than by looking for text in the bytes.
  // pdf-lib packs its objects into compressed streams, so the page objects
  // are not there to be found as plain text. The first version of this test
  // searched for them and counted none.
  const pdf = await PDFDocument.load(await resultBytes(page));
  expect(pdf.getPageCount()).toBe(3);
  await expect(page.getByText(/one page each, in the order listed/)).toBeVisible();
});
