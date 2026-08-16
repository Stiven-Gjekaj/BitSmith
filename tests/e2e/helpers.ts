import { deflateSync } from "node:zlib";
import { expect, type Page } from "@playwright/test";

/**
 * Shared moves for the browser tests.
 *
 * Files are built here in Node and handed over with `setInputFiles`, which is
 * the supported way to fill a file input. An earlier version built the file
 * inside the page and dispatched a change event by hand. That raced the
 * island: the tool interface does not exist in the static HTML at all, so
 * until React hydrates there is no handler to receive the event, and the file
 * was dropped in silence. Some tests won that race and some lost it.
 *
 * `setInputFiles` waits for the control before it acts, which removes the race
 * rather than papering over it.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Writes a real PNG of an exact size.
 *
 * Written by hand rather than through a codec, so a browser test needs no
 * WebAssembly to start and the size is exactly what the test asked for. The
 * picture is a two-tone gradient, which is enough for a converter to work on
 * and enough for a crop to be visible.
 */
export function makePng(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // eight bits for each channel
  header[9] = 6; // red, green, blue, and alpha
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // Each row starts with a filter byte. Zero means the row is stored as it is.
  const raw = Buffer.alloc(height * (1 + width * 4));
  let at = 0;
  for (let y = 0; y < height; y += 1) {
    raw[at] = 0;
    at += 1;
    for (let x = 0; x < width; x += 1) {
      raw[at] = Math.round((x / Math.max(1, width - 1)) * 255);
      raw[at + 1] = Math.round((y / Math.max(1, height - 1)) * 255);
      raw[at + 2] = 128;
      raw[at + 3] = 255;
      at += 4;
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Writes a small PDF with an exact page count.
 *
 * A PDF is a text format at heart, so a valid one can be built from a string
 * with a table of byte offsets at the end. Building it here means the test
 * states its own input instead of trusting a fixture it did not make.
 */
export function makePdf(pages: number): Buffer {
  const objects: string[] = [];
  const kids: string[] = [];

  for (let index = 0; index < pages; index += 1) {
    const id = 3 + index;
    kids.push(`${id} 0 R`);
    objects.push(
      `${id} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n`,
    );
  }

  const bodyParts = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Count ${pages} /Kids [${kids.join(" ")}] >>\nendobj\n`,
    ...objects,
  ];

  const head = "%PDF-1.4\n";
  const offsets: number[] = [];
  let position = head.length;
  for (const part of bodyParts) {
    offsets.push(position);
    position += part.length;
  }

  const count = bodyParts.length + 1;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    table += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  const tail = `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`;
  return Buffer.from(head + bodyParts.join("") + table + tail, "latin1");
}

/**
 * Waits for the island to hydrate.
 *
 * The tool interface is not in the static HTML at all, so the first control
 * appearing is the signal that React has taken over. Acting before that puts
 * a file on an input with no handler behind it, and the file is dropped in
 * silence.
 */
export async function toolReady(
  page: Page,
  selector = 'input[type="file"]',
): Promise<void> {
  await page.locator(selector).first().waitFor({ state: "attached" });
}

/** Hands a picture of an exact size to the file input. */
export async function giveImage(
  page: Page,
  name: string,
  width = 120,
  height = 90,
): Promise<void> {
  await toolReady(page);
  await page.setInputFiles('input[type="file"]', {
    name,
    mimeType: "image/png",
    buffer: makePng(width, height),
  });
}

/** Hands several pictures over at once. */
export async function giveImages(
  page: Page,
  names: string[],
): Promise<void> {
  await toolReady(page);
  await page.setInputFiles(
    'input[type="file"]',
    names.map((name) => ({
      name,
      mimeType: "image/png",
      buffer: makePng(120, 90),
    })),
  );
}

/** Hands a PDF with a known page count to the file input. */
export async function givePdf(
  page: Page,
  name: string,
  pages: number,
): Promise<void> {
  await toolReady(page);
  await page.setInputFiles('input[type="file"]', {
    name,
    mimeType: "application/pdf",
    buffer: makePdf(pages),
  });
}

/** Hands several PDF files over at once. */
export async function givePdfs(
  page: Page,
  files: Array<[string, number]>,
): Promise<void> {
  await toolReady(page);
  await page.setInputFiles(
    'input[type="file"]',
    files.map(([name, pages]) => ({
      name,
      mimeType: "application/pdf",
      buffer: makePdf(pages),
    })),
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
export function resultName(page: Page): Promise<string | null> {
  return page.locator("a[download]").first().getAttribute("download");
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
