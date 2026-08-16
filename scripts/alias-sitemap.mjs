/**
 * Also publishes the sitemap under the name people expect.
 *
 * Astro writes `sitemap-index.xml`. Everyone, including whoever is typing into
 * Search Console, reaches for `sitemap.xml`, because that is the conventional
 * name and the one every guide gives. Submitting the wrong one fails quietly:
 * Search Console records "could not be read" and the pages simply never get
 * crawled, with nothing on the site itself looking broken.
 *
 * So the file is copied rather than renamed. Both names work, and a submission
 * made with either one is right.
 *
 * The copy happens on every build, so the two cannot drift. Writing a
 * `sitemap.xml` by hand would go stale the moment a page is added, which is
 * the same failure wearing a different hat.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const source = join(dist, "sitemap-index.xml");
const target = join(dist, "sitemap.xml");

if (!existsSync(source)) {
  // Not an error worth stopping a build for, but it must not pass unnoticed:
  // it would mean the sitemap integration stopped running.
  console.warn(
    "No sitemap-index.xml in dist/. The sitemap integration did not run, so " +
      "nothing was copied to sitemap.xml.",
  );
} else {
  copyFileSync(source, target);
  console.log("Copied sitemap-index.xml to sitemap.xml.");
}
