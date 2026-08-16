import type { RawImage } from "./codecs";

/**
 * Turning and mirroring, kept beside the codecs rather than inside a tool.
 *
 * Two callers need these. The rotate tool is the obvious one. The other is
 * decode(), which has to turn a photograph the way its orientation tag says
 * before anything else sees it, and a decoder that reached into a tool folder
 * to do that would be the wrong way round.
 */

/** Quarter turns clockwise. Anything else is one of these four. */
export type Turns = 0 | 1 | 2 | 3;

/**
 * Turns a picture a quarter of the way round, clockwise.
 *
 * Width and height swap. That is the part worth testing, because a picture
 * that keeps its old width still looks plausible on screen while every row
 * after the first is wrong.
 */
function quarterTurn(image: RawImage): RawImage {
  const { data, width, height } = image;
  const out = new Uint8ClampedArray(data.length);
  const outWidth = height;
  const outHeight = width;

  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      // Clockwise: the left column of the source becomes the top row of the
      // result, read from the bottom up.
      const from = ((height - 1 - x) * width + y) * 4;
      const to = (y * outWidth + x) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }

  return { data: out, width: outWidth, height: outHeight };
}

/** Turns a picture by any number of quarters, clockwise. */
export function rotateRaw(image: RawImage, turns: Turns): RawImage {
  let out = image;
  // A negative or oversized count is folded into the four that exist, so the
  // caller cannot ask for something this cannot do.
  const count = ((turns % 4) + 4) % 4;
  for (let done = 0; done < count; done += 1) {
    out = quarterTurn(out);
  }
  return out;
}

/** Mirrors a picture. The size does not change. */
export function flipRaw(
  image: RawImage,
  axis: "horizontal" | "vertical",
): RawImage {
  const { data, width, height } = image;
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = axis === "horizontal" ? width - 1 - x : x;
      const sourceY = axis === "vertical" ? height - 1 - y : y;
      const from = (sourceY * width + sourceX) * 4;
      const to = (y * width + x) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }

  return { data: out, width, height };
}
