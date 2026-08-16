import { expect, type Page } from "@playwright/test";

/**
 * Shared moves for the browser tests.
 *
 * Every tool has the same shell, so every test does the same four things:
 * give it a file, press the button, wait for a result, and read the bytes
 * back. Writing that once keeps the tests about the tool.
 */

/**
 * Builds a picture in the page and hands it to the file input.
 *
 * The file is made in the browser rather than read from disk, so the test
 * needs no fixture on the machine running it and the picture is the same
 * everywhere. It goes through the real input, so the whole shell runs.
 */
export async function giveImage(
  page: Page,
  name: string,
  width = 120,
  height = 90,
): Promise<void> {
  await page.evaluate(
    async ({ name, width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no canvas context");

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#e11d48");
      gradient.addColorStop(1, "#0284c7");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("no blob");

      const input = document.querySelector<HTMLInputElement>(
        'input[type="file"]',
      );
      if (!input) throw new Error("no file input");

      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], name, { type: "image/png" }));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, width, height },
  );
}

/** Reads the finished file back out of the download link. */
export async function resultBytes(page: Page): Promise<Uint8Array> {
  const numbers = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>("a[download]");
    if (!link) throw new Error("no download link");
    const buffer = await (await fetch(link.href)).arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  });
  return new Uint8Array(numbers);
}

/** The name the download link offers. */
export async function resultName(page: Page): Promise<string> {
  return page.locator("a[download]").first().getAttribute("download") as
    Promise<string>;
}

/** Presses the one action button and waits for a file to appear. */
export async function runAndWait(page: Page, label: RegExp): Promise<void> {
  await page.getByRole("button", { name: label }).click();
  await expect(page.locator("a[download]").first()).toBeVisible({
    timeout: 80_000,
  });
}

/** Names the format from the first bytes, the way the engine does. */
export function sniff(bytes: Uint8Array): string | null {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));

  if (bytes[0] === 0x89 && ascii(1, 3) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (ascii(4, 4) === "ftyp") return "avif";
  if (ascii(0, 4) === "%PDF") return "pdf";
  if (ascii(0, 5) === "<?xml" || ascii(0, 4) === "<svg") return "svg";
  return null;
}
