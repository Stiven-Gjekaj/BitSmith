import { expect, test } from "@playwright/test";
import {
  chooseOption,
  giveImage,
  resultBytes,
  resultName,
  runAndWait,
  sniff,
  toolReady,
  giveJpegFixture,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./compress-image/");
});

test("will not run without a picture", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /Compress the picture/ }),
  ).toBeDisabled();
});

/**
 * The only assertion that matters to the person using this: the file that
 * arrives fits the size they typed. Everything the search does inside is
 * beside the point if this is not true.
 */
test("delivers a file inside the size that was asked for", async ({ page }) => {
  await giveImage(page, "holiday.png", 400, 300);
  await toolReady(page);

  await page.getByLabel(/Fit inside/).fill("3");
  await runAndWait(page, /Compress the picture/);

  const bytes = await resultBytes(page);
  expect(bytes.length).toBeLessThanOrEqual(3 * 1024);
  expect(sniff(bytes)).toBe("jpeg");
  expect(await resultName(page)).toBe("holiday.jpg");
});

test("says what it asked for and what it delivered", async ({ page }) => {
  await giveImage(page, "holiday.png", 400, 300);
  await page.getByLabel(/Fit inside/).fill("5");

  await runAndWait(page, /Compress the picture/);

  await expect(
    page.getByText(
      /KB in, .* KB out at quality .* which is what was asked for/,
    ),
  ).toBeVisible();
});

test("writes WebP when asked for it", async ({ page }) => {
  await giveImage(page, "holiday.png", 400, 300);
  await chooseOption(page, "Save as", /WebP/);

  await runAndWait(page, /Compress the picture/);

  expect(sniff(await resultBytes(page))).toBe("webp");
});

/**
 * An impossible target has to say so, and say what is possible. Silence or a
 * file over the size would both be worse than a refusal.
 */
test("refuses a target it cannot reach, and names one it can", async ({
  page,
}) => {
  await giveImage(page, "holiday.png", 400, 300);
  await page.getByLabel(/Fit inside/).fill("1");

  await page.getByRole("button", { name: /Compress the picture/ }).click();

  await expect(page.getByText(/smallest this format gets it is/)).toBeVisible({
    timeout: 30_000,
  });
});

test("keeps a small JPEG inside the requested size", async ({ page }) => {
  await giveJpegFixture(page, "gradient.jpg", "gradient.jpg");

  await page.getByLabel(/Fit inside/).fill("1");

  await runAndWait(page, /Compress the picture/);

  const bytes = await resultBytes(page);

  expect(bytes.length).toBeLessThanOrEqual(1024);
  expect(sniff(bytes)).toBe("jpeg");
});
