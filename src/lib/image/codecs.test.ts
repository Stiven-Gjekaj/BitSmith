import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decode, encode, sniff } from "./codecs";

const png = new Uint8Array(readFileSync("tests/fixtures/gradient.png"));
const jpg = new Uint8Array(readFileSync("tests/fixtures/gradient.jpg"));
const heic = new Uint8Array(readFileSync("tests/fixtures/gradient.heic"));

/**
 * Reads the first bytes directly, without calling sniff.
 *
 * A test that used sniff to prove that sniff works would pass whatever sniff
 * did. These checks are the independent statement that the fixtures are what
 * the other tests assume.
 */
describe("the fixtures", () => {
  it("gradient.png really starts with the PNG signature", () => {
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("gradient.jpg really starts with the JPEG marker", () => {
    expect([...jpg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("gradient.heic really is an ISO base media file with a HEIC brand", () => {
    const ascii = (start: number, length: number) =>
      String.fromCharCode(...heic.subarray(start, start + length));
    expect(ascii(4, 4)).toBe("ftyp");
    expect(ascii(8, 4)).toBe("heic");
  });
});

describe("sniff", () => {
  it("names a PNG", () => {
    expect(sniff(png)).toBe("png");
  });

  it("names a JPEG", () => {
    expect(sniff(jpg)).toBe("jpeg");
  });

  it("gives nothing for bytes that are not a picture", () => {
    expect(
      sniff(new TextEncoder().encode("this is just some text at all")),
    ).toBe(null);
  });

  it("gives nothing for a file too short to identify", () => {
    expect(sniff(new Uint8Array([0x89, 0x50]))).toBe(null);
  });

  it("reads the bytes and not the file name", () => {
    // A visitor renames a JPEG to .png often enough that this matters. The
    // engine never sees the name, which is the point being locked in here.
    expect(sniff(jpg)).toBe("jpeg");
    expect(sniff(png)).toBe("png");
  });
});

describe("sniff, on ISO base media files", () => {
  /**
   * Builds an ftyp box with the brands laid out where the format puts them:
   * a length, the tag, the major brand, a minor version, then the compatible
   * brands, four bytes each.
   */
  const ftyp = (major: string, compatible: string[]) => {
    const size = 16 + compatible.length * 4;
    const bytes = new Uint8Array(size);
    const put = (at: number, text: string) => {
      for (let i = 0; i < 4; i += 1) {
        bytes[at + i] = text.charCodeAt(i);
      }
    };
    bytes[0] = size >> 24;
    bytes[1] = (size >> 16) & 0xff;
    bytes[2] = (size >> 8) & 0xff;
    bytes[3] = size & 0xff;
    put(4, "ftyp");
    put(8, major);
    compatible.forEach((brand, index) => {
      put(16 + index * 4, brand);
    });
    return bytes;
  };

  it("names the real HEIC fixture", () => {
    expect(sniff(heic)).toBe("heic");
  });

  /**
   * The reason the whole brand list is read rather than the major brand only.
   * These files decode perfectly well and were refused at the door, because
   * the old check looked at offset 8 and stopped.
   */
  it("names an AVIF whose major brand is mif1", () => {
    expect(sniff(ftyp("mif1", ["mif1", "avif", "miaf"]))).toBe("avif");
  });

  /**
   * Order of the two questions, not the presence of either answer. "mif1" is
   * on both lists, so asking about HEIC first would name this file HEIC.
   */
  it("prefers AVIF when a file carries both brands", () => {
    expect(sniff(ftyp("mif1", ["heic", "avif"]))).toBe("avif");
  });

  it("names the other HEIC brands", () => {
    for (const brand of ["heix", "hevc", "heim", "msf1"]) {
      expect(sniff(ftyp(brand, [brand]))).toBe("heic");
    }
  });

  /**
   * A damaged or hostile file can claim any length it likes. The walk must
   * stop at the real end of the data rather than reading on.
   */
  it("returns rather than reading past the end on a lying length", () => {
    const bytes = ftyp("heic", ["heic"]);
    bytes[0] = 0xff;
    bytes[1] = 0xff;
    bytes[2] = 0xff;
    bytes[3] = 0xff;
    expect(sniff(bytes)).toBe("heic");
  });

  it("names an unknown brand nothing at all", () => {
    expect(sniff(ftyp("qt  ", ["qt  "]))).toBeNull();
  });
});

describe("decode", () => {
  it("reads the size out of a PNG", async () => {
    const image = await decode(png);
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
    expect(image.data.length).toBe(64 * 48 * 4);
  });

  it("reads the size out of a JPEG", async () => {
    const image = await decode(jpg);
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
  });

  it("refuses a file that is not a picture, and says so plainly", async () => {
    const text = new TextEncoder().encode(
      "Dear reader, this is not a picture.",
    );
    await expect(decode(text)).rejects.toThrow(
      /not a PNG, JPEG, WebP, AVIF, or HEIC/,
    );
  });
});

describe("encode", () => {
  // Each case asserts a property of the output rather than its bytes. An
  // encoder changes its output between versions, so a byte comparison would
  // fail for a reason that has nothing to do with this project.
  const formats = [
    ["png", [0x89, 0x50, 0x4e, 0x47]],
    ["jpeg", [0xff, 0xd8, 0xff]],
  ] as const;

  for (const [format, signature] of formats) {
    it(`writes a real ${format} that decodes at the same size`, async () => {
      const image = await decode(png);
      const bytes = await encode(image, format, 80);

      expect([...bytes.subarray(0, signature.length)]).toEqual([...signature]);

      const back = await decode(bytes);
      expect(back.width).toBe(64);
      expect(back.height).toBe(48);
    });
  }

  it("writes a WebP that this project can read back", async () => {
    const image = await decode(png);
    const bytes = await encode(image, "webp", 80);
    expect(sniff(bytes)).toBe("webp");

    const back = await decode(bytes);
    expect(back.width).toBe(64);
    expect(back.height).toBe(48);
  });

  it("writes an AVIF that this project can read back", async () => {
    const image = await decode(png);
    const bytes = await encode(image, "avif", 60);
    expect(sniff(bytes)).toBe("avif");

    const back = await decode(bytes);
    expect(back.width).toBe(64);
    expect(back.height).toBe(48);
  });

  it("makes a smaller file at a lower quality", async () => {
    const image = await decode(png);
    const good = await encode(image, "jpeg", 95);
    const poor = await encode(image, "jpeg", 20);
    expect(poor.byteLength).toBeLessThan(good.byteLength);
  });

  it("honours the quality for AVIF as well", async () => {
    // This guards a failure that hides. An older version of the encoder took
    // the option under another name, and passing the wrong name is ignored in
    // silence: every picture comes out at the default quality, the file is
    // valid, the size is right, and the slider does nothing at all. Only a
    // comparison between two qualities can see it.
    const image = await decode(png);
    const good = await encode(image, "avif", 90);
    const poor = await encode(image, "avif", 15);
    expect(poor.byteLength).toBeLessThan(good.byteLength);
  });
});

describe("decode, on a HEIC", () => {
  it("gives the size the fixture was made at", async () => {
    const image = await decode(heic);
    expect(image.width).toBe(64);
    expect(image.height).toBe(48);
    expect(image.data.length).toBe(64 * 48 * 4);
  });

  /**
   * A decoded picture, not a blank one. An empty buffer of the right size
   * would satisfy every assertion above, so this asks whether the pixels
   * carry the gradient the fixture was made from.
   */
  it("gives pixels that vary across the picture", async () => {
    const image = await decode(heic);
    const first = image.data.subarray(0, 4).join(",");
    const last = image.data.subarray(image.data.length - 4).join(",");
    expect(first).not.toBe(last);
    expect([...image.data.subarray(0, 3)].some((value) => value > 0)).toBe(
      true,
    );
  });

  it("makes every pixel fully opaque", async () => {
    const image = await decode(heic);
    for (let at = 3; at < image.data.length; at += 4) {
      expect(image.data[at]).toBe(255);
    }
  });

  /**
   * A truncated file must say so rather than hang. libheif is WebAssembly and
   * a bad read inside it is much harder to diagnose than a thrown error.
   */
  it("refuses a truncated HEIC with an error", async () => {
    await expect(decode(heic.subarray(0, 200))).rejects.toThrow();
  });
});
