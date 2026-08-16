import { expect, test } from "@playwright/test";
import { makePng, resultBytes, resultName, sniff, toolReady } from "./helpers";

/**
 * The only browser coverage the background remover has.
 *
 * It is the tool that most needs it. It is the one that has already shipped
 * broken with a green build, because its Node tests measured the shape of the
 * output and not whether the output was a picture of anything. It is also the
 * only tool that fetches a 17 MB model, runs WebAssembly, and may or may not
 * find a graphics card, none of which a Node test exercises.
 *
 * The model makes this slow, so the suite runs it on the desktop project only
 * and gives it room.
 */
test.describe("the background remover", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "The model is large and one browser is enough to prove it loads.",
  );

  test("takes the background off a picture", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("./remove-background/");
    await toolReady(page);

    await page.setInputFiles('input[type="file"]', {
      name: "portrait.png",
      mimeType: "image/png",
      buffer: makePng(96, 64),
    });

    await page.getByRole("button", { name: /Remove the background/ }).click();

    // The model download and the first run are both slow, and slower again on
    // a machine with no graphics card.
    await expect(page.locator("a[download]")).toBeVisible({
      timeout: 150_000,
    });

    expect(await resultName(page)).toBe("portrait.png");
    const bytes = await resultBytes(page);
    expect(sniff(bytes)).toBe("png");

    // The size is kept. A picture that came back a different shape would mean
    // the model ran and the result was put together wrongly.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(16)).toBe(96);
    expect(view.getUint32(20)).toBe(64);
  });

  test("says what it is doing while the model loads", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("./remove-background/");
    await toolReady(page);

    await page.setInputFiles('input[type="file"]', {
      name: "portrait.png",
      mimeType: "image/png",
      buffer: makePng(64, 64),
    });
    await page.getByRole("button", { name: /Remove the background/ }).click();

    // Something has to be on screen during a wait this long. A page that sat
    // silent for a minute would be read as broken. More than one thing
    // qualifies, so this asks only that at least one of them is showing.
    await expect(
      page.getByRole("progressbar").or(page.getByText(/model/i)).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
