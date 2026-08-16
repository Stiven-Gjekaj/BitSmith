import { PDFDocument } from "pdf-lib";
import { decode, encode, sniff } from "../../lib/image/codecs";
import { type Engine, withExtension } from "../../lib/pipeline/types";

/** The paper a page is cut to, in points, which is what a PDF measures in. */
const PAPER = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

export type Paper = keyof typeof PAPER | "picture";

export interface BuildOptions {
  paper: Paper;
  /** A margin in points, ignored when each page is cut to its picture. */
  margin: number;
}

export const DEFAULTS: BuildOptions = { paper: "a4", margin: 36 };

export const run: Engine<BuildOptions> = async (files, options, onProgress) => {
  if (files.length === 0) {
    throw new Error("Choose at least one picture.");
  }

  const pdf = await PDFDocument.create();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onProgress(index / files.length, `Adding ${file.name}`);

    const format = sniff(file.bytes);
    if (!format) {
      throw new Error(
        `${file.name} is not a picture this can read. Choose a PNG, JPEG, ` +
          "WebP, AVIF, or HEIC.",
      );
    }

    // A JPEG and a PNG go in exactly as they arrived, with no decoding at all.
    // That is worth the extra branch: it is the difference between a
    // photograph that keeps every byte of its original compression and one
    // that has been through another lossy pass for no reason.
    //
    // The other three have to be turned into one of those two first, because
    // a PDF cannot hold them. WebP and AVIF become PNG so nothing is lost a
    // second time, and so does HEIC.
    const embedded =
      format === "jpeg"
        ? await pdf.embedJpg(file.bytes)
        : format === "png"
          ? await pdf.embedPng(file.bytes)
          : await pdf.embedPng(await encode(await decode(file.bytes), "png"));

    const page =
      options.paper === "picture"
        ? pdf.addPage([embedded.width, embedded.height])
        : pdf.addPage([
            PAPER[options.paper].width,
            PAPER[options.paper].height,
          ]);

    if (options.paper === "picture") {
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
    } else {
      // Fitted inside the margins, keeping its shape. Scaling to fill the page
      // would stretch a photograph into the wrong proportions, which is a
      // thing nobody asks for and everybody notices.
      const room = {
        width: page.getWidth() - options.margin * 2,
        height: page.getHeight() - options.margin * 2,
      };
      const scale = Math.min(
        room.width / embedded.width,
        room.height / embedded.height,
      );
      const width = embedded.width * scale;
      const height = embedded.height * scale;
      page.drawImage(embedded, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });
    }
  }

  onProgress(0.95, "Writing the file");
  const bytes = await pdf.save();
  onProgress(1, "Done");

  // One PDF, named after the first picture, because a document made of twenty
  // photographs has to be called something and the first one is the only name
  // the visitor gave.
  return [
    {
      name: withExtension(files[0].name, "pdf"),
      type: "application/pdf",
      bytes,
      note:
        files.length === 1
          ? undefined
          : `${files.length} pictures, one page each, in the order listed.`,
    },
  ];
};
