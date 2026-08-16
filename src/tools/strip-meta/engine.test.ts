import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decode, encode } from "../../lib/image/codecs";
import { run } from "./engine";

const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
const jpg = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));
const heic = new Uint8Array(readFileSync("tests/fixtures/gradient.heic"));

const file = (name: string, bytes: Uint8Array) => ({
  name,
  bytes,
  type: "application/octet-stream",
});

describe("the strip metadata engine", () => {
  it("refuses an empty list", async () => {
    await expect(run([], {}, () => {})).rejects.toThrow(/Choose a picture/);
  });

  it("sends a JPEG and a PNG to the right stripper", async () => {
    const results = await run(
      [file("a.jpg", jpg), file("b.png", png)],
      {},
      () => {},
    );
    expect(results.map((result) => result.type)).toEqual([
      "image/jpeg",
      "image/png",
    ]);
  });

  it("keeps the name it was given", async () => {
    const [result] = await run([file("holiday.jpg", jpg)], {}, () => {});
    expect(result.name).toBe("holiday.jpg");
  });

  /**
   * The formats that are refused, and the message that says so.
   *
   * Silence would be worse than a refusal here. A visitor who handed this a
   * HEIC and got the file back unchanged would reasonably believe the
   * metadata had gone.
   */
  it("says plainly that it will not do a HEIC", async () => {
    await expect(run([file("IMG.heic", heic)], {}, () => {})).rejects.toThrow(
      /HEIC.*JPEG and PNG/s,
    );
  });

  it("says plainly that it will not do a WebP", async () => {
    const webp = await encode(await decode(png), "webp", 80);
    await expect(run([file("a.webp", webp)], {}, () => {})).rejects.toThrow(
      /WebP/,
    );
  });

  it("refuses something that is not a picture at all", async () => {
    const notAPicture = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    await expect(
      run([file("x.bin", notAPicture)], {}, () => {}),
    ).rejects.toThrow(/not a picture/);
  });

  /**
   * The note is the only way a visitor can tell an untouched file from a
   * cleaned one, because both come back looking the same and the size alone
   * cannot say which happened.
   */
  it("says when a file carried no metadata", async () => {
    const [result] = await run([file("clean.png", png)], {}, () => {});
    expect(result.note).toMatch(/carried no metadata/);
  });

  it("says how much it removed when it removed something", async () => {
    const marked = new Uint8Array(jpg.length + 24);
    const body = new TextEncoder().encode("Exif\0\0GPS 51.5074N");
    marked.set(jpg.subarray(0, 2), 0);
    marked[2] = 0xff;
    marked[3] = 0xe1;
    marked[4] = 0;
    marked[5] = body.length + 2;
    marked.set(body, 6);
    marked.set(jpg.subarray(2), 6 + body.length);

    const [result] = await run(
      [
        file(
          "holiday.jpg",
          marked.subarray(0, 6 + body.length + jpg.length - 2),
        ),
      ],
      {},
      () => {},
    );
    expect(result.note).toMatch(/Removed \d+ bytes/);
    expect(result.bytes.length).toBeLessThan(marked.length);
  });

  it("reports progress that ends at one", async () => {
    const seen: number[] = [];
    await run([file("a.jpg", jpg), file("b.png", png)], {}, (value) =>
      seen.push(value),
    );
    expect(seen[seen.length - 1]).toBe(1);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});
