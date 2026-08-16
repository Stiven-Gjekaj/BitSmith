// @ts-check
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// GitHub Pages serves a project site under a path, not at the root of a
// domain. Both values below must stay correct together: `site` builds the
// absolute URLs in the sitemap, and `base` prefixes every internal link.
// Never write a link as "/tools/qr". Write it with the base, or the link
// breaks in production while it still works in development.
const SITE = "https://stiven-gjekaj.github.io";
const BASE = "/bitsmith";

export default defineConfig({
  site: SITE,
  base: BASE,

  // The plan says to choose one trailing slash rule and keep it. A mixed rule
  // puts the same page in the search index twice. GitHub Pages serves a
  // directory as `index.html`, so "always" matches what the host already does.
  trailingSlash: "always",

  integrations: [react(), mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    // The worker is built as a module, which is what lets a dynamic import
    // inside it become a separate file.
    //
    // Vite writes workers as one self contained script by default, and that
    // format cannot split, so every dynamic import inside the worker is
    // flattened into it. libheif is 1.4 MB and is wanted only by a visitor
    // converting a HEIC, but flattening put it in the one file that every
    // tool run downloads: the worker went from 824,346 to 2,284,316 bytes,
    // and a QR code paid for a HEIC decoder.
    //
    // The worker is already constructed with `type: "module"` in
    // src/lib/pipeline/runTool.ts, so this only makes the build agree with
    // the call site.
    worker: {
      format: "es",
    },
    // These packages ship WebAssembly and load it at run time. The dependency
    // optimiser rewrites their imports and breaks that loading, so it must
    // leave them alone.
    optimizeDeps: {
      exclude: [
        "@jsquash/png",
        "@jsquash/jpeg",
        "@jsquash/webp",
        "@jsquash/avif",
        "@jsquash/resize",
        "onnxruntime-web",
      ],
    },
  },
});
