import { expect, test } from "@playwright/test";
import {
  giveImage,
  giveImages,
  resultBytes,
  resultName,
  runAndWait,
  sniff,
  toolReady,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./rotate-image/");
});

test("will not run without a picture", async ({ page }) => {
  await expect(page.getByRole("button", { name: /Turn the picture/ })).toBeDisabled();
});

/**
 * The tool starts at 90 right.
 *
 * First choose None so the default cannot make this test pass when the Enter
 * key does nothing. The changed size then proves that the keyboard choice
 * reached the engine.
 */
const turnNames = ["None", "90 right", "180", "90 left"] as const;
const mirrorNames = ["Left to right", "Top to bottom"] as const;

test("a keyboard reaches each turn and mirror button", async ({ page }) => {
  await toolReady(page);
  await page.locator('input[type="file"]').focus();

  for (const name of [...turnNames, ...mirrorNames]) {
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeFocused();
  }
});

test("a keyboard chooses turns and mirrors and reports their state", async ({ page }) => {
  await toolReady(page);

  await page.getByRole("button", { name: "180", exact: true }).focus();
  await page.keyboard.press("Space");

  for (const name of turnNames) {
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", name === "180" ? "true" : "false");
  }

  await page.getByRole("button", { name: "90 left", exact: true }).focus();
  await page.keyboard.press("Enter");

  for (const name of turnNames) {
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", name === "90 left" ? "true" : "false");
  }

  const leftToRight = page.getByRole("button", {
    name: "Left to right",
    exact: true,
  });
  const topToBottom = page.getByRole("button", {
    name: "Top to bottom",
    exact: true,
  });

  await leftToRight.focus();
  await page.keyboard.press("Space");

  await expect(leftToRight).toHaveAttribute("aria-pressed", "true");
  await expect(topToBottom).toHaveAttribute("aria-pressed", "false");

  await topToBottom.focus();
  await page.keyboard.press("Enter");

  await expect(topToBottom).toHaveAttribute("aria-pressed", "true");
  await expect(leftToRight).toHaveAttribute("aria-pressed", "true");
});

test("a keyboard turn changes the picture size", async ({ page }) => {
  await giveImage(page, "keyboard-turn.png", 120, 90);

  const none = page.getByRole("button", { name: "None", exact: true });
  await none.focus();
  await page.keyboard.press("Space");
  await expect(none).toHaveAttribute("aria-pressed", "true");

  const left = page.getByRole("button", {
    name: "90 left",
    exact: true,
  });
  await left.focus();
  await page.keyboard.press("Enter");
  await expect(left).toHaveAttribute("aria-pressed", "true");

  await runAndWait(page, /Turn the picture/);

  const bytes = await resultBytes(page);
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );

  expect(view.getUint32(16)).toBe(90);
  expect(view.getUint32(20)).toBe(120);
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
