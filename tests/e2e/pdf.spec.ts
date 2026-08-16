import { expect, test } from "@playwright/test";
import { chooseOption, givePdf, givePdfs, resultBytes, runAndWait, sniff } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./merge-pdf/");
});

test("joining needs two files", async ({ page }) => {
  await givePdf(page, "only.pdf", 2);
  await expect(page.getByText("only.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: /Join the files/ })).toBeDisabled();
  await expect(page.getByText(/Add a second file/)).toBeVisible();
});

test("joins two files into one", async ({ page }) => {
  await givePdfs(page, [
    ["a.pdf", 2],
    ["b.pdf", 3],
  ]);
  await expect(page.getByText("a.pdf")).toBeVisible();
  await expect(page.getByText("b.pdf")).toBeVisible();

  await runAndWait(page, /Join the files/);
  expect(sniff(await resultBytes(page))).toBe("pdf");
});

test("switching to page picking shows the range box", async ({ page }) => {
  await expect(page.getByLabel("Pages to keep")).toHaveCount(0);
  await chooseOption(page, "What do you want to do", /Keep only some pages/);
  await expect(page.getByLabel("Pages to keep")).toBeVisible();
});

/**
 * Acting in the page picking mode, which had no browser test until now.
 *
 * One was written before and removed. It failed reproducibly inside the suite
 * while passing on its own, and at the moment of failure the page showed the
 * merge mode with the file already listed: the mode had reverted after the
 * control and React appeared to have agreed on it.
 *
 * That was this race. The mode was chosen while the page was still the HTML
 * Astro rendered, and React then mounted with the mode it starts in and threw
 * the choice away. The note said the cause was not found. It is now, and the
 * test comes back.
 */
test("keeps only the pages that were named", async ({ page }) => {
  await givePdf(page, "report.pdf", 6);
  await chooseOption(page, "What do you want to do", /Keep only some pages/);
  await page.getByLabel("Pages to keep").fill("1-3");

  await runAndWait(page, /Take those pages/);

  const bytes = await resultBytes(page);
  expect(sniff(bytes)).toBe("pdf");
  // Six pages in, three named, three out.
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(3);
});
