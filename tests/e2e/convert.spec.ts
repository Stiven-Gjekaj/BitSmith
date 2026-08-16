import { expect, test } from "@playwright/test";
import {
  chooseOption,
  giveImage,
  giveImages,
  resultBytes,
  resultName,
  runAndWait,
  sniff,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./image-converter/");
});

test("turns a PNG into a WebP", async ({ page }) => {
  await giveImage(page, "holiday.png");
  await expect(page.getByText("holiday.png")).toBeVisible();

  await runAndWait(page, /Convert/);

  expect(await resultName(page)).toBe("holiday.webp");
  expect(sniff(await resultBytes(page))).toBe("webp");
});

test("writes each format it offers", async ({ page }) => {
  for (const [choice, expected] of [
    [/JPEG/, "jpeg"],
    [/PNG/, "png"],
    [/AVIF/, "avif"],
  ] as const) {
    await page.goto("./image-converter/");
    await giveImage(page, "sample.png");
    await chooseOption(page, "Convert to", choice);
    await runAndWait(page, /Convert/);
    expect(sniff(await resultBytes(page))).toBe(expected);
  }
});

test("converts more than one file at a time", async ({ page }) => {
  await giveImages(page, ["one.png", "two.png"]);
  await expect(page.getByText("one.png")).toBeVisible();
  await expect(page.getByText("two.png")).toBeVisible();

  await runAndWait(page, /Convert/);
  await expect(page.locator("a[download]")).toHaveCount(2);
});

test("a file can be taken back off the list", async ({ page }) => {
  await giveImage(page, "keep.png");
  await giveImage(page, "drop.png");

  await page
    .locator("li", { hasText: "drop.png" })
    .getByRole("button", { name: "Remove" })
    .click();

  await expect(page.getByText("drop.png")).toHaveCount(0);
  await expect(page.getByText("keep.png")).toBeVisible();
});

test("the quality control is off for a lossless format", async ({ page }) => {
  await giveImage(page, "sample.png");
  await chooseOption(page, "Convert to", /PNG/);
  // PNG loses nothing, so a quality slider on it would be a control that does
  // not control anything.
  await expect(page.locator("[data-slot=slider]")).toHaveAttribute(
    "data-disabled",
    "",
  );

  await chooseOption(page, "Convert to", /JPEG/);
  await expect(page.locator("[data-slot=slider]")).not.toHaveAttribute(
    "data-disabled",
    "",
  );
});

test("shows progress and then the finished file", async ({ page }) => {
  await giveImage(page, "sample.png", 900, 700);
  await page.getByRole("button", { name: /Convert/ }).click();

  await expect(page.locator("a[download]").first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Your file")).toBeVisible();
});
