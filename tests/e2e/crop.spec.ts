import { expect, test } from "@playwright/test";
import { chooseOption, giveImage, resultBytes, runAndWait, sniff } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./crop-image/");
});

/** Reads the real size of the finished picture, in the page. */
async function resultSize(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>("a[download]");
    if (!link) throw new Error("no download link");
    const bitmap = await createImageBitmap(await (await fetch(link.href)).blob());
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  });
}

test("reads the size of the picture it is given", async ({ page }) => {
  await giveImage(page, "photo.png", 240, 160);
  // The boxes cannot be filled in sensibly until the page knows the size, so
  // it says the size out loud.
  await expect(page.getByText("This picture is 240 by 160 pixels")).toBeVisible();
});

test("crops to the rectangle it is given", async ({ page }) => {
  await giveImage(page, "photo.png", 240, 160);
  await expect(page.getByText("This picture is 240 by 160")).toBeVisible();

  await page.getByLabel("From the left").fill("20");
  await page.getByLabel("From the top").fill("10");
  await page.getByLabel("Width", { exact: true }).fill("100");
  await page.getByLabel("Height", { exact: true }).fill("60");

  await runAndWait(page, /Apply/);
  expect(await resultSize(page)).toEqual({ width: 100, height: 60 });
});

test("resizes to an exact width and height", async ({ page }) => {
  await giveImage(page, "photo.png", 240, 160);
  await expect(page.getByText("This picture is 240 by 160")).toBeVisible();

  await page.getByLabel("New width").fill("60");
  await page.getByLabel("New height").fill("40");

  await runAndWait(page, /Apply/);
  expect(await resultSize(page)).toEqual({ width: 60, height: 40 });
});

test("leaves the size alone when nothing is asked for", async ({ page }) => {
  await giveImage(page, "photo.png", 240, 160);
  await expect(page.getByText("This picture is 240 by 160")).toBeVisible();

  await runAndWait(page, /Apply/);
  expect(await resultSize(page)).toEqual({ width: 240, height: 160 });
});

test("saves in the format that is chosen", async ({ page }) => {
  await giveImage(page, "photo.png", 120, 90);
  await expect(page.getByText("This picture is 120 by 90")).toBeVisible();

  await chooseOption(page, "Save as", "WebP");
  await runAndWait(page, /Apply/);
  expect(sniff(await resultBytes(page))).toBe("webp");
});

test("the controls wait for a picture", async ({ page }) => {
  // Numbers entered before there is a picture mean nothing, and a control
  // that accepts meaningless input invites it.
  await expect(page.getByLabel("From the left")).toBeDisabled();
  await expect(page.getByRole("button", { name: /Apply/ })).toBeDisabled();
});
