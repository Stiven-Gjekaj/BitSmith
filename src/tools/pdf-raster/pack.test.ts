import { describe, expect, it } from "vitest";
import { type RawImage, sniff } from "../../lib/image/codecs";
import { packPage } from "./pack";

const solid = (width: number, height: number): RawImage => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < data.length; at += 4) {
    data[at] = 200;
    data[at + 1] = 60;
    data[at + 2] = 40;
    data[at + 3] = 255;
  }
  return { data, width, height };
};

const base = {
  index: 0,
  total: 3,
  format: "png" as const,
  quality: 90,
  sourceName: "report.pdf",
};

describe("packPage", () => {
  it("names a page after the document it came from", async () => {
    const result = await packPage(solid(8, 6), base);
    expect(result.name).toBe("report-page-1.png");
  });

  it("writes bytes that really are the format asked for", async () => {
    for (const format of ["png", "jpeg", "webp"] as const) {
      const result = await packPage(solid(8, 6), { ...base, format });
      expect(sniff(result.bytes), format).toBe(format);
    }
  });

  it("gives the extension the format uses, not its name", async () => {
    const result = await packPage(solid(8, 6), { ...base, format: "jpeg" });
    expect(result.name).toBe("report-page-1.jpg");
  });

  /**
   * The mistake nobody checks and everybody notices after printing: a folder
   * of twelve pages that lists page 10 straight after page 1.
   */
  it("pads the number so the files sort the way the document reads", async () => {
    const ten = await packPage(solid(8, 6), {
      ...base,
      index: 9,
      total: 12,
    });
    const nine = await packPage(solid(8, 6), {
      ...base,
      index: 8,
      total: 12,
    });
    expect(nine.name).toBe("report-page-09.png");
    expect(ten.name).toBe("report-page-10.png");
    expect([ten.name, nine.name].sort()).toEqual([nine.name, ten.name]);
  });

  it("does not pad when the document is short enough not to need it", async () => {
    const result = await packPage(solid(8, 6), { ...base, index: 2, total: 3 });
    expect(result.name).toBe("report-page-3.png");
  });

  it("counts pages from one, the way a person does", async () => {
    const result = await packPage(solid(8, 6), { ...base, index: 0 });
    expect(result.name).toContain("page-1");
  });

  it("copes with a name that has no extension at all", async () => {
    const result = await packPage(solid(8, 6), {
      ...base,
      sourceName: "scan",
    });
    expect(result.name).toBe("scan-page-1.png");
  });
});
