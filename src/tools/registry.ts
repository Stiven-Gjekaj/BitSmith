/**
 * The manifest of every tool.
 *
 * One entry here generates the route, the card on the home page, the sitemap,
 * the structured data, and the related links. To add a tool you add one entry,
 * one engine, one component, and one page text. Nothing else changes.
 *
 * `runsOn` and `isolated` are here from the first day even though nothing
 * needs them yet. They cost one line each now, and adding them later means
 * touching every entry and every page that reads one.
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
  /** The largest file the tool accepts. A limit with a clear message beats a
   *  crash: mobile Safari stops a tab that uses too much memory and tells the
   *  visitor nothing. */
  maxBytes?: number;
  /** Tier 1 and tier 2 tools run on the device. Tier 3 needs a server. */
  runsOn: RunsOn;
  /** True when the tool needs cross-origin isolation. No tool needs it yet. */
  isolated: boolean;
  /**
   * True when the worker is kept alive between runs.
   *
   * The default throws the worker away after each run, so no codec can carry
   * state from one file into the next. A tool with a large model cannot pay
   * that: the inference session dies with the worker, and building it again
   * parses megabytes. Only set this where the model makes it worth the risk.
   */
  reusesWorker?: boolean;
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
    tagline: "Change a picture between PNG, JPEG, WebP, AVIF, and HEIC.",
    description:
      "Convert an image to PNG, JPEG, WebP, or AVIF, and choose the quality. " +
      "Reads the HEIC that an iPhone writes. The picture never leaves your " +
      "device.",
    inputKind: "files",
    // The .heic and .heif extensions are listed beside the types on purpose.
    // Many systems report an empty or wrong type for a HEIC, and a picker
    // given types alone greys the file out, so the visitor cannot choose the
    // file this tool exists to read.
    accept:
      "image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif," +
      ".heic,.heif",
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
      "heic to jpg",
      "heic to png",
      "iphone photo to jpg",
    ],
  },
  {
    slug: "compress-image",
    title: "Compress Image",
    tagline: "Make a picture fit inside a size an upload form allows.",
    description:
      "Give a size in kilobytes and get the best looking picture that fits " +
      "inside it. Useful when a form refuses a photograph for being too big. " +
      "Nothing is uploaded.",
    inputKind: "files",
    accept:
      "image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif," +
      ".heic,.heif",
    multiple: true,
    maxBytes: 30 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "compress image",
      "reduce image size",
      "make photo under 2mb",
      "resize photo for upload",
      "shrink jpg",
    ],
  },
  {
    slug: "strip-metadata",
    title: "Remove Photo Metadata",
    tagline: "Take the place, the date, and the camera out of a picture.",
    description:
      "A photograph carries where it was taken, when, and on what. This " +
      "removes all of it without rebuilding the picture, so nothing is lost. " +
      "JPEG, PNG and WebP. The file never leaves your device.",
    inputKind: "files",
    accept: "image/png,image/jpeg,image/webp",
    multiple: true,
    maxBytes: 30 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "remove exif",
      "remove gps from photo",
      "strip metadata",
      "remove location from picture",
      "clear photo data",
    ],
  },
  {
    slug: "rotate-image",
    title: "Rotate Image",
    tagline: "Turn a picture the right way up, or mirror it.",
    description:
      "Turn a picture by a quarter, a half, or three quarters, and mirror it " +
      "either way. Works on several pictures at once. Nothing is uploaded.",
    inputKind: "files",
    accept: "image/png,image/jpeg,image/webp,image/avif",
    multiple: true,
    maxBytes: 30 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "rotate image",
      "rotate picture 90 degrees",
      "flip image",
      "mirror image",
      "turn photo sideways",
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
    slug: "pdf-to-image",
    title: "PDF to Image",
    tagline: "Turn the pages of a PDF into pictures.",
    description:
      "Every page becomes its own picture, numbered so the order holds. " +
      "Useful for putting a page into a slide or a message. The document " +
      "never leaves your device.",
    inputKind: "files",
    accept: "application/pdf,.pdf",
    multiple: false,
    maxBytes: 60 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "pdf to jpg",
      "pdf to png",
      "pdf to image",
      "convert pdf pages to pictures",
      "extract images from pdf",
    ],
  },
  {
    slug: "image-to-pdf",
    title: "Image to PDF",
    tagline: "Put pictures into one PDF, a page each.",
    description:
      "Turn photographs or scans into a single PDF, one page for each " +
      "picture. Useful for sending a set of receipts or a signed form. " +
      "Nothing is uploaded.",
    inputKind: "files",
    accept:
      "image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif," +
      ".heic,.heif",
    multiple: true,
    maxBytes: 30 * MB,
    runsOn: "device",
    isolated: false,
    keywords: [
      "image to pdf",
      "jpg to pdf",
      "photo to pdf",
      "scan to pdf",
      "combine pictures into pdf",
    ],
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
    reusesWorker: true,
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
