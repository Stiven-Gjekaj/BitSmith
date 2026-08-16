import { describe, expect, it } from "vitest";
import { findTool, tools } from "./registry";

describe("the registry", () => {
  it("gives every tool a slug that is unique", () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every tool that takes files something it will accept", () => {
    for (const tool of tools.filter((entry) => entry.inputKind === "files")) {
      expect(tool.accept, tool.slug).toBeTruthy();
    }
  });

  it("finds a tool by its slug, and nothing by a slug that is not there", () => {
    expect(findTool("image-converter")?.title).toBe("Image Converter");
    expect(findTool("not-a-tool")).toBeUndefined();
  });
});

/**
 * Which tools may be handed a HEIC.
 *
 * This looks like an oversight and it is not, so it is written down as a test
 * rather than left as an absence somebody helpfully corrects.
 *
 * The converter can read a HEIC because it never shows the picture that comes
 * in. Dropzone lists names and sizes, and the panel previews the picture that
 * comes out, which is always PNG, JPEG, WebP or AVIF.
 *
 * The cropper cannot. It calls createImageBitmap on the file the visitor
 * chose, and it draws that file on a canvas to be cropped. Chrome and Firefox
 * carry no HEIC decoder, so both of those fail. Adding HEIC to the cropper
 * would let a visitor choose a file that the tool can then neither show nor
 * measure, which is worse than the picker refusing it in the first place.
 */
describe("which tools accept a HEIC", () => {
  const accepts = (slug: string) => findTool(slug)?.accept ?? "";

  it("lets a HEIC into the converter", () => {
    expect(accepts("image-converter")).toContain("image/heic");
  });

  /**
   * The extensions matter as much as the types. Many systems report an empty
   * or wrong type for a HEIC, and a picker given types alone greys the file
   * out.
   */
  it("names the HEIC extensions as well as the types", () => {
    expect(accepts("image-converter")).toContain(".heic");
    expect(accepts("image-converter")).toContain(".heif");
  });

  it("keeps a HEIC out of the cropper, which would have to draw it", () => {
    expect(accepts("crop-image")).not.toContain("heic");
  });
});
