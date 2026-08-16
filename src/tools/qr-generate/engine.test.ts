import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { decode, sniff } from "../../lib/image/codecs";
import { DEFAULTS, run } from "./engine";

const silent = () => {};

describe("the QR code engine", () => {
  it("writes an SVG that holds a drawing", async () => {
    const [result] = await run([], { ...DEFAULTS, text: "hello" }, silent);

    expect(result.type).toBe("image/svg+xml");
    expect(result.name).toBe("qr-code.svg");
    const svg = new TextDecoder().decode(result.bytes);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("writes a real PNG when asked for one", async () => {
    const [result] = await run(
      [],
      { ...DEFAULTS, format: "png", text: "hello" },
      silent,
    );

    expect(sniff(result.bytes)).toBe("png");
    expect(result.name).toBe("qr-code.png");
  });

  it("draws the code that the library built", async () => {
    // This is the assertion that tests this project rather than the library.
    // The engine turns a matrix of modules into pixels, and a mistake in that
    // arithmetic gives a picture of the right size holding the wrong pattern.
    // So compare the pixels back against the matrix, module by module.
    const text = "BITSMITH";
    const [result] = await run(
      [],
      {
        ...DEFAULTS,
        format: "png",
        text,
        scale: 1,
        margin: 0,
        errorCorrection: "M",
      },
      silent,
    );

    const image = await decode(result.bytes);
    const expected = QRCode.create(text, { errorCorrectionLevel: "M" });
    const size = expected.modules.size;

    expect(image.width).toBe(size);
    expect(image.height).toBe(size);

    let checked = 0;
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        const dark = expected.modules.get(row, column);
        const red = image.data[(row * size + column) * 4];
        expect(red).toBe(dark ? 0 : 255);
        checked += 1;
      }
    }
    // Guard against a silent pass if the loops never ran.
    expect(checked).toBe(size * size);
  });

  it("grows the picture with the scale", async () => {
    const base = { ...DEFAULTS, format: "png" as const, text: "x", margin: 0 };
    const [small] = await run([], { ...base, scale: 2 }, silent);
    const [large] = await run([], { ...base, scale: 6 }, silent);

    const a = await decode(small.bytes);
    const b = await decode(large.bytes);
    expect(b.width).toBe(a.width * 3);
  });

  it("leaves the margin light so a reader can find the code", async () => {
    const [result] = await run(
      [],
      { ...DEFAULTS, format: "png", text: "x", scale: 1, margin: 4 },
      silent,
    );

    const image = await decode(result.bytes);
    // The very first pixel sits in the quiet zone. A QR reader needs that
    // area light, and a transparent one photographs as whatever is behind it.
    expect(image.data[0]).toBe(255);
    expect(image.data[3]).toBe(255);
  });

  it("gives different codes for different text", async () => {
    const [a] = await run([], { ...DEFAULTS, text: "one" }, silent);
    const [b] = await run([], { ...DEFAULTS, text: "two" }, silent);
    expect(new TextDecoder().decode(a.bytes)).not.toBe(
      new TextDecoder().decode(b.bytes),
    );
  });

  it("asks for text rather than making an empty code", async () => {
    await expect(run([], { ...DEFAULTS, text: "   " }, silent)).rejects.toThrow(
      /Type some text or a link/,
    );
  });
});
