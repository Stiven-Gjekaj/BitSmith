import { lazy, Suspense } from "react";

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
      <Ui preset={preset} />
    </Suspense>
  );
}
