import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { giveImage, resultBytes, resultName, runAndWait, toolReady } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("./strip-metadata/");
});

test("will not run without a picture", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: /Clean the picture/ }),
  ).toBeDisabled();
});

/**
 * A clean file must say it was clean.
 *
 * This is the case the note exists for. The file comes back the same size it
 * went in, so without a sentence the visitor cannot tell whether anything was
 * found, and would reasonably assume something was.
 */
test("says so when a file carried nothing", async ({ page }) => {
  await giveImage(page, "screenshot.png");

  await runAndWait(page, /Clean the picture/);

  expect(await resultName(page)).toBe("screenshot.png");
  await expect(page.getByText(/carried no metadata/)).toBeVisible();
});

/**
 * The real job, driven through the browser: a JPEG carrying a location comes
 * back without it.
 */
test("takes a location out of a photograph", async ({ page }) => {
  await toolReady(page);
  await page.setInputFiles('input[type="file"]', {
    name: "holiday.jpg",
    mimeType: "image/jpeg",
    buffer: withExif(),
  });

  await runAndWait(page, /Clean the picture/);

  await expect(page.getByText(/Removed \d+ bytes/)).toBeVisible();

  const bytes = await resultBytes(page);
  expect(Buffer.from(bytes).includes("GPS 51.5074N")).toBe(false);
  // Still a JPEG, and still the same picture.
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
});

/**
 * Splices an Exif segment into the committed JPEG fixture.
 *
 * Built here rather than committed as a second fixture, so the test states
 * exactly what it put in and can then assert that precisely that came out.
 */
function withExif(): Buffer {
  const plain = readFileSync("tests/fixtures/gradient.jpg");
  const body = Buffer.from("Exif\0\0GPS 51.5074N 0.1278W", "latin1");
  const header = Buffer.from([0xff, 0xe1, 0, body.length + 2]);
  return Buffer.concat([
    plain.subarray(0, 2),
    header,
    body,
    plain.subarray(2),
  ]);
}
