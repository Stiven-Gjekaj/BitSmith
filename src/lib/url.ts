/**
 * Builds an internal link.
 *
 * GitHub Pages serves this site under a path, not at the root of a domain.
 * A link written as "/crop-image/" works in development and breaks in
 * production, because production adds the base in front. Every internal link
 * goes through this function so that the mistake cannot happen once.
 */
export function href(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  if (clean === "") {
    return `${base}/`;
  }
  return `${base}/${clean.replace(/\/$/, "")}/`;
}
