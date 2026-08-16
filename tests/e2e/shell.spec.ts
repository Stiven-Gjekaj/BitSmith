import { expect, test } from "@playwright/test";
import { pairs } from "../../src/tools/image-convert/pairs";
import { tools } from "../../src/tools/registry";

/**
 * The parts every page shares.
 *
 * These would all have passed before this suite existed, and none of them was
 * ever checked by anything but a person looking at the screen.
 *
 * The lists come from the registries rather than from a copy kept here. The
 * copy was five slugs and the number five written three times, so the first
 * new tool would have turned this suite red before any of its own code was
 * wrong. A test that has to be edited to admit a correct change is a test
 * that trains people to edit tests.
 */

const SLUGS = tools.map((tool) => tool.slug);

test("the home page lists every tool and each card arrives", async ({
  page,
}) => {
  await page.goto("./");

  const cards = page.locator("section.tools a");
  await expect(cards).toHaveCount(SLUGS.length);

  // A card that renders is not a card that arrives somewhere. Follow each one.
  for (let index = 0; index < SLUGS.length; index += 1) {
    await page.goto("./");
    const card = page.locator("section.tools a").nth(index);
    const title = (await card.locator(".card-title").textContent()) ?? "";
    await card.click();
    await expect(page.locator("h1")).toHaveText(title.trim());
  }
});

test("every tool page says where the file goes", async ({ page }) => {
  for (const slug of SLUGS) {
    await page.goto(`./${slug}/`);
    await expect(
      page.getByText("This file stays on your device"),
    ).toBeVisible();
  }
});

test("the content is visible without waiting for anything", async ({
  page,
}) => {
  // A scroll observer once left three of the five cards at zero opacity, and
  // the page looked empty. Entrances are CSS now, and this holds that.
  await page.goto("./");
  const cards = page.locator("section.tools a");

  // The entrance is staggered, so the last card starts about 700 ms late.
  // toHaveCSS retries, which is the difference between testing the finished
  // state and testing a moment during the animation.
  for (let index = 0; index < 5; index += 1) {
    await expect(cards.nth(index)).toHaveCSS("opacity", "1");
  }
});

test("a keyboard can reach the file control", async ({ page }) => {
  await page.goto("./image-converter/");
  // The drop area is not the control. The input behind it is, and a keyboard
  // user has nothing else.
  const input = page.locator('input[type="file"]');
  await expect(input).toBeAttached();
  await expect(page.getByText("Choose files")).toBeVisible();
});

test("every page carries its own title and description", async ({ page }) => {
  // Each address ends in a slash. The site is built with trailing slashes, so
  // the form without one is a redirect and not the page itself.
  for (const slug of ["", `${SLUGS[0]}/`, `${pairs[0].slug}/`]) {
    await page.goto(`./${slug}`);
    expect(await page.title()).toContain("Bitsmith");
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect((description ?? "").length).toBeGreaterThan(40);
  }
});

test("no page reports a console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  // Every tool page, and one conversion page. The old list named three of the
  // six kinds of page, so a console error on the PDF tool or on any of the
  // twelve conversion pages went unseen.
  for (const slug of ["", ...SLUGS.map((s) => `${s}/`), `${pairs[0].slug}/`]) {
    await page.goto(`./${slug}`);
    await page.waitForLoadState("networkidle");
  }

  expect(errors).toEqual([]);
});
