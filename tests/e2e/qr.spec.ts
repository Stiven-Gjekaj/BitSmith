import { expect, test } from "@playwright/test";
import { resultBytes, resultName, runAndWait, sniff, toolReady } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./qr-code-generator/");
  await toolReady(page, "textarea");
});

test("makes an SVG from a link", async ({ page }) => {
  await page.getByLabel("Text or link").fill("https://bitsmith.tools");
  await runAndWait(page, /Make the code/);

  expect(await resultName(page)).toBe("qr-code.svg");
  const text = new TextDecoder().decode(await resultBytes(page));
  expect(text).toContain("<svg");
  expect(text).toContain("</svg>");
});

test("makes a real PNG when asked for one", async ({ page }) => {
  await page.getByLabel("Text or link").fill("hello");
  await page.getByLabel("File type").selectOption("png");
  await runAndWait(page, /Make the code/);

  expect(await resultName(page)).toBe("qr-code.png");
  expect(sniff(await resultBytes(page))).toBe("png");
});

test("will not run on an empty box", async ({ page }) => {
  // The button is the guard. A code made from nothing scans as nothing, and a
  // visitor would not know why.
  await expect(page.getByRole("button", { name: /Make the code/ })).toBeDisabled();

  await page.getByLabel("Text or link").fill("x");
  await expect(
    page.getByRole("button", { name: /Make the code/ }),
  ).toBeEnabled();
});

test("different text gives a different code", async ({ page }) => {
  await page.getByLabel("Text or link").fill("one");
  await runAndWait(page, /Make the code/);
  const first = new TextDecoder().decode(await resultBytes(page));

  await page.getByRole("button", { name: /Start again/ }).click();
  await page.getByLabel("Text or link").fill("two");
  await runAndWait(page, /Make the code/);
  const second = new TextDecoder().decode(await resultBytes(page));

  expect(first).not.toBe(second);
});

test("the result offers a download with a file name", async ({ page }) => {
  await page.getByLabel("Text or link").fill("download me");
  await runAndWait(page, /Make the code/);

  const link = page.locator("a[download]").first();
  await expect(link).toHaveAttribute("download", "qr-code.svg");
  expect(await link.getAttribute("href")).toMatch(/^blob:/);
});
