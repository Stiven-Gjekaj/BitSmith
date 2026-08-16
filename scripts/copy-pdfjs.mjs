/**
 * Copies the pdfjs assets that are fetched at run time.
 *
 * pdfjs does not carry the standard fonts or the character maps inside its
 * code. It asks for them over the network when a document needs one, from a
 * folder the caller has to name.
 *
 * How much this matters was measured rather than assumed, and the answer is
 * narrower than expected. With the font folder pointed at a directory that
 * does not exist, a document naming Helvetica without embedding it still drew
 * its text: pdfjs carries the fourteen standard fonts itself. The folders
 * earn their place for the documents beyond that, above all text that is not
 * Latin, which needs the character maps.
 *
 * Where this does fail, it fails silently. Nothing throws, a picture is still
 * produced, and the text is simply missing from it.
 *
 * This is the same shape of problem that copy-ort.mjs solves for the model
 * runtime, and the same answer: copy the files into public/ at build time so
 * they are served from this site rather than fetched from somewhere else.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const target = join(process.cwd(), "public", "pdfjs");

mkdirSync(target, { recursive: true });

for (const name of ["standard_fonts", "cmaps"]) {
  const from = join(root, name);
  if (!existsSync(from)) {
    console.error(
      `pdfjs-dist has no ${name} folder. A PDF using a font it does not ` +
        "embed would render blank, so this is a failure and not a warning.",
    );
    process.exit(1);
  }
  cpSync(from, join(target, name), { recursive: true });
  console.log(`Copied pdfjs ${name} to public/pdfjs/${name}.`);
}
