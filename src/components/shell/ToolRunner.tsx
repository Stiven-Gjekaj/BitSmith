import { lazy, Suspense } from "react";

/**
 * Loads the interface for one tool.
 *
 * Each entry is a separate chunk, so a visitor who opens the QR page never
 * downloads the PDF library or the background removal code.
 */
const uis: Record<string, React.LazyExoticComponent<() => React.ReactNode>> = {
  "qr-code-generator": lazy(() => import("../../tools/qr-generate/Tool")),
  "image-converter": lazy(() => import("../../tools/image-convert/Tool")),
  "crop-image": lazy(() => import("../../tools/image-crop/Tool")),
  "merge-pdf": lazy(() => import("../../tools/pdf-pages/Tool")),
  "remove-background": lazy(() => import("../../tools/bg-remove/Tool")),
};

export default function ToolRunner({ slug }: { slug: string }) {
  const Ui = uis[slug];

  if (!Ui) {
    return <p role="alert">This tool is not available.</p>;
  }

  return (
    <Suspense fallback={<p className="text-slate-500">Loading the tool.</p>}>
      <Ui />
    </Suspense>
  );
}
