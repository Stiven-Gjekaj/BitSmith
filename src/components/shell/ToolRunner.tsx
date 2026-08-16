import { lazy, Suspense, useEffect } from "react";

/**
 * Loads the interface for one tool.
 *
 * Each entry is a separate chunk, so a visitor who opens the QR page never
 * downloads the PDF library or the background removal code.
 */
/** What a page may set on the tool before a visitor touches it. */
export interface ToolPreset {
  [key: string]: unknown;
}

const uis: Record<
  string,
  React.LazyExoticComponent<(props: { preset?: ToolPreset }) => React.ReactNode>
> = {
  "qr-code-generator": lazy(() => import("../../tools/qr-generate/Tool")),
  "image-converter": lazy(() => import("../../tools/image-convert/Tool")),
  "crop-image": lazy(() => import("../../tools/image-crop/Tool")),
  "rotate-image": lazy(() => import("../../tools/image-rotate/Tool")),
  "strip-metadata": lazy(() => import("../../tools/strip-meta/Tool")),
  "compress-image": lazy(() => import("../../tools/compress/Tool")),
  "merge-pdf": lazy(() => import("../../tools/pdf-pages/Tool")),
  "image-to-pdf": lazy(() => import("../../tools/pdf-build/Tool")),
  "pdf-to-image": lazy(() => import("../../tools/pdf-raster/Tool")),
  "remove-background": lazy(() => import("../../tools/bg-remove/Tool")),
};

export default function ToolRunner({
  slug,
  preset,
}: {
  slug: string;
  /** A conversion page opens the converter already pointed at its format. */
  preset?: ToolPreset;
}) {
  const Ui = uis[slug];

  if (!Ui) {
    return <p role="alert">This tool is not available.</p>;
  }

  return (
    <Suspense fallback={<p className="text-slate-500">Loading the tool.</p>}>
      <Mounted />
      <Ui preset={preset} />
    </Suspense>
  );
}

/**
 * Says, in the page itself, that the tool is now under React's control.
 *
 * The controls are in the HTML before any of this runs, because Astro renders
 * them on the server. They look finished and they are not: nothing typed into
 * them reaches React until the tool has mounted, and the tool is behind a lazy
 * import, so it arrives some time after the page does.
 *
 * A browser test that starts typing in that gap gets a control that holds its
 * text and a button that never enables, because React's own state is still
 * empty. That produced a timeout roughly one run in three, on whichever test
 * happened to be unlucky, and it looked like a different fault every time.
 *
 * An effect is the signal because an effect cannot run on the server. When
 * this attribute is in the document, React has mounted and is listening.
 */
function Mounted() {
  useEffect(() => {
    document.documentElement.dataset.toolReady = "true";
    return () => {
      delete document.documentElement.dataset.toolReady;
    };
  }, []);
  return null;
}
