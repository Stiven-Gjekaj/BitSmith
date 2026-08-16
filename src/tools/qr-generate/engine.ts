import QRCode from "qrcode";
import { encode } from "../../lib/image/codecs";
import type { Engine } from "../../lib/pipeline/types";

export interface QrOptions {
  text: string;
  format: "svg" | "png";
  /** Pixels for each module of the code, in the PNG. */
  scale: number;
  /** Quiet space around the code, counted in modules. */
  margin: number;
  errorCorrection: "L" | "M" | "Q" | "H";
}

export const DEFAULTS: QrOptions = {
  text: "",
  format: "svg",
  scale: 8,
  margin: 2,
  errorCorrection: "M",
};

/**
 * Builds a QR code.
 *
 * SVG is the default because a QR code is line art. It stays sharp at any
 * size, and a printed code is often wanted much larger than the screen.
 *
 * The PNG path builds the pixels here rather than through a canvas, so the
 * engine stays free of browser APIs and a test can run it in Node.
 */
export const run: Engine<QrOptions> = async (_files, options, onProgress) => {
  const text = options.text?.trim();
  if (!text) {
    throw new Error("Type some text or a link first.");
  }

  onProgress(0.3, "Building the code");

  if (options.format === "svg") {
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin: options.margin,
      errorCorrectionLevel: options.errorCorrection,
    });

    onProgress(0.9, "Writing the file");
    return [
      {
        name: "qr-code.svg",
        type: "image/svg+xml",
        bytes: new TextEncoder().encode(svg),
      },
    ];
  }

  const code = QRCode.create(text, {
    errorCorrectionLevel: options.errorCorrection,
  });

  const modules = code.modules;
  const size = modules.size;
  const scale = Math.max(1, Math.round(options.scale));
  const margin = Math.max(0, Math.round(options.margin));
  const side = (size + margin * 2) * scale;

  const data = new Uint8ClampedArray(side * side * 4);
  // Start from white. A QR reader needs the quiet zone to be light, so the
  // margin must not be left transparent.
  data.fill(255);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!modules.get(row, column)) {
        continue;
      }
      const originX = (column + margin) * scale;
      const originY = (row + margin) * scale;

      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          const offset = ((originY + y) * side + originX + x) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
          data[offset + 3] = 255;
        }
      }
    }
    if (row % 8 === 0) {
      onProgress(0.3 + (row / size) * 0.5, "Drawing the code");
    }
  }

  onProgress(0.85, "Writing the file");
  const bytes = await encode({ data, width: side, height: side }, "png");

  return [{ name: "qr-code.png", type: "image/png", bytes }];
};
