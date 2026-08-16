import { expect, test } from "@playwright/test";
import { giveImage, resultBytes, resultName, runAndWait, sniff } from "./helpers";

/**
 * The conversion pages.
 *
 * These exist to be found, so the tests check the two things that decide
 * whether they work: each one carries its own writing, and each one opens the
 * converter already pointed the right way. A page that looked right and
 * converted to the wrong format would be worse than no page, because it would
 * take a visitor's file and hand back something they did not ask for.
 */

test("png to jpg opens already pointed at JPG", async ({ page }) => {
  await page.goto("./png-to-jpg/");
  await expect(page.getByLabel("Convert to")).toHaveValue("jpeg");

  await giveImage(page, "holiday.png");
  await runAndWait(page, /Convert/);

  expect(await resultName(page)).toBe("holiday.jpg");
  expect(sniff(await resultBytes(page))).toBe("jpeg");
});

test("webp to png opens already pointed at PNG", async ({ page }) => {
  await page.goto("./webp-to-png/");
  await expect(page.getByLabel("Convert to")).toHaveValue("png");
});

test("the controls are not locked", async ({ page }) => {
  // A page that forced its format would be built for a search engine rather
  // than for the person who arrived. Somebody who lands on png to jpg and
  // decides they want WebP should not have to find another address.
  await page.goto("./png-to-jpg/");
  await page.getByLabel("Convert to").selectOption("webp");
  await expect(page.getByLabel("Convert to")).toHaveValue("webp");

  await giveImage(page, "holiday.png");
  await runAndWait(page, /Convert/);
  expect(sniff(await resultBytes(page))).toBe("webp");
});

test("each page says something of its own", async ({ page }) => {
  // Pages that share their words with two swapped are read as spam, and that
  // can lower the whole site. This compares the writing on two pages that are
  // as close as any two get.
  const read = async (slug: string) => {
    await page.goto(`./${slug}/`);
    return (await page.locator("section.notes").innerText()).toLowerCase();
  };

  const first = await read("png-to-jpg");
  const second = await read("webp-to-jpg");

  expect(first.length).toBeGreaterThan(400);
  expect(second.length).toBeGreaterThan(400);

  const words = (text: string) => new Set(text.match(/[a-z']+/g) ?? []);
  const a = words(first);
  const b = words(second);
  const shared = [...a].filter((word) => b.has(word)).length;
  const overlap = shared / new Set([...a, ...b]).size;

  // Half is comfortable for two pages that discuss the same subject in the
  // same voice. Anything approaching one would mean the words were reused.
  expect(overlap).toBeLessThan(0.6);
});

test("a conversion page answers the three questions", async ({ page }) => {
  await page.goto("./jpg-to-webp/");
  await expect(
    page.getByRole("heading", { name: /Why turn a JPG into a WebP/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /What the change costs/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /When to do something else/ }),
  ).toBeVisible();
});

test("every pair is reachable from the home page", async ({ page }) => {
  await page.goto("./");
  const links = page.locator("section.pairs a");
  await expect(links).toHaveCount(12);

  // A link that renders is not a link that arrives. Follow one.
  await links.first().click();
  await expect(page.locator("h1")).toContainText("Convert");
});

test("a conversion page carries its own title and description", async ({
  page,
}) => {
  await page.goto("./avif-to-jpg/");
  expect(await page.title()).toContain("Convert AVIF to JPG");

  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(description).toContain("AVIF");
  expect(description).toContain("JPG");
});
