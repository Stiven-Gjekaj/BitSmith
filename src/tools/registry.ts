/**
 * The manifest of every tool.
 *
 * One entry here generates the route, the card on the home page, the sitemap,
 * the structured data, and the related links. To add a tool you add one entry,
 * one engine, one component, and one page text. Nothing else changes.
 *
 * Section 7 of docs/plan.md explains why this file carries `runsOn` and
 * `isolated` from the first day.
 */

/** Where the work happens. This drives the badge on the tool page. */
export type RunsOn = "device" | "server";

export interface ToolMeta {
  /** The address of the page. Task-shaped, because a visitor searches for a
   *  task and not for a brand. */
  slug: string;
  /** The page title and the card title. */
  title: string;
  /** One line under the title. */
  tagline: string;
  /** The meta description for a search engine. */
  description: string;
  /** What the tool takes. A QR code needs text, and the others need files. */
  inputKind: "files" | "text";
  /** The value for the accept attribute on the file input. */
  accept?: string;
  /** Whether the tool takes more than one file. */
  multiple?: boolean;
  /** The largest file the tool accepts. Section 16 of the plan explains why a
   *  limit with a message beats a crash on a phone. */
  maxBytes?: number;
  /** Tier 1 and tier 2 tools run on the device. Tier 3 needs a server. */
  runsOn: RunsOn;
  /** True when the tool needs cross-origin isolation. No tool needs it yet. */
  isolated: boolean;
  /** Words a visitor might search for. */
  keywords: string[];
}

const MB = 1024 * 1024;

export const tools: ToolMeta[] = [
  {
    slug: "qr-code-generator",
    title: "QR Code Generator",
    tagline: "Turn a link or a note into a QR code you can print.",
    description:
      "Make a QR code from any text or link. Download it as SVG or PNG. " +
      "The code is built in your browser, so nothing is uploaded.",
    inputKind: "text",
    runsOn: "device",
    isolated: false,
    keywords: ["qr code", "qr generator", "make a qr code", "url to qr"],
  },
  {
    slug: "image-converter",
    title: "Image Converter",
    tagline: "Change a picture between PNG, JPEG, WebP, and AVIF.",
    description:
      "Convert an image to PNG, JPEG, WebP, or AVIF, and choose the quality. " +
      "The picture never leaves your device.",
    inputKind: "files",
    accept: "image/png,image/jpeg,image/webp,image/avif",
    multiple: true,
    maxBytes: 30 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "png to jpg",
      "jpg to png",
      "convert to webp",
      "convert to avif",
      "image converter",
    ],
  },
  {
    slug: "crop-image",
    title: "Crop and Resize Image",
    tagline: "Cut a picture down, or change how big it is.",
    description:
      "Crop a picture to the part you want, or resize it to an exact width " +
      "and height. Runs in your browser with no upload.",
    inputKind: "files",
    accept: "image/png,image/jpeg,image/webp,image/avif",
    multiple: false,
    maxBytes: 30 * MB,
    runsOn: "device",
    isolated: false,
    keywords: ["crop image", "resize image", "make a photo smaller"],
  },
  {
    slug: "merge-pdf",
    title: "Merge and Split PDF",
    tagline: "Join PDF files, or take the pages you want out of one.",
    description:
      "Merge several PDF files into one, or keep only the pages you choose. " +
      "The files stay on your device.",
    inputKind: "files",
    accept: "application/pdf",
    multiple: true,
    maxBytes: 100 * MB,
    runsOn: "device",
    isolated: false,
    keywords: ["merge pdf", "combine pdf", "split pdf", "delete pdf pages"],
  },
  {
    slug: "remove-background",
    title: "Background Remover",
    tagline: "Take the background out of a photograph.",
    description:
      "Remove the background from a photo and get a PNG with a clear " +
      "background. The model runs in your browser, so the photo is never sent " +
      "anywhere.",
    inputKind: "files",
    accept: "image/png,image/jpeg,image/webp",
    multiple: false,
    maxBytes: 15 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "remove background",
      "transparent background",
      "cut out a photo",
    ],
  },
];

export function findTool(slug: string): ToolMeta | undefined {
  return tools.find((tool) => tool.slug === slug);
}

/** Every other tool, for the related links at the foot of a tool page. */
export function otherTools(slug: string): ToolMeta[] {
  return tools.filter((tool) => tool.slug !== slug);
}
