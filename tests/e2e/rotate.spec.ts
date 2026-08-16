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
  await page.goto("./rotate-image/");
});

test("will not run without a picture", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Turn the picture/ })).toBeDisabled();
});

/**
 * The size is what proves the turn happened.
 *
 * A picture that came back unturned would still be a valid PNG with the right
 * name, and nothing else on the page would look wrong. Reading the width and
 * height back out of the bytes is the only assertion here that a broken
 * rotation cannot pass.
 */
test("turns a picture a quarter, swapping its sides", async ({ page }) => {
  await giveImage(page, "sideways.png", 120, 90);

  await runAndWait(page, /Turn the picture/);

  expect(await resultName(page)).toBe("sideways.png");
  const bytes = await resultBytes(page);
  expect(sniff(bytes)).toBe("png");

  // A PNG carries its size at a fixed place in the header, so this needs no
  // decoder: width is the four bytes at 16, height the four at 20.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(16)).toBe(90);
  expect(view.getUint32(20)).toBe(120);
});

test("leaves the size alone on a half turn", async ({ page }) => {
  await giveImage(page, "upside-down.png", 120, 90);

  await page.getByRole("button", { name: "180" }).click();
  await runAndWait(page, /Turn the picture/);

  const bytes = await resultBytes(page);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(16)).toBe(120);
  expect(view.getUint32(20)).toBe(90);
});

test("mirrors without turning", async ({ page }) => {
  await giveImage(page, "mirror.png", 120, 90);

  await page.getByRole("button", { name: "None" }).click();
  await page.getByRole("button", { name: "Left to right" }).click();
  await runAndWait(page, /Turn the picture/);

  const bytes = await resultBytes(page);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(16)).toBe(120);
  expect(view.getUint32(20)).toBe(90);
});

test("turns more than one picture at a time", async ({ page }) => {
  await giveImages(page, ["one.png", "two.png"]);

  await runAndWait(page, /Turn 2 pictures/);

  await expect(page.locator("a[download]")).toHaveCount(2);
});
