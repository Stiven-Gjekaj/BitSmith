<div align="center">
  <a href="README.md"><b>Bitsmith</b></a>
</div>

# Changelog

All notable changes to Bitsmith are recorded here.
The format is based on Keep a Changelog (https://keepachangelog.com), and the
project aims to follow semantic versioning.

A commit carries no version prefix and changes no version.
A version moves only when something is released.

## Unreleased

Version 1 is built. All five tools work, and the site is live on GitHub Pages
at https://stiven-gjekaj.github.io/bitsmith/.

### Added

- **The shell.** A drop area with a real file input beside it, a size limit
  with a message, progress in a live region, a result list with downloads, and
  focus that moves to the result when the work finishes.
- **The tool registry.** One entry generates the route, the home page card,
  the sitemap, the structured data, and the related links.
- **Five tools.** A QR code generator, an image converter for PNG, JPEG, WebP
  and AVIF, a cropper and resizer, a PDF merge and split, and a background
  remover that runs u2netp in the browser.
- **55 tests** across 6 files, run in Node with no browser.
- **Two workflows.** CI checks the links, the lint, the types, the tests, and
  the build. A second one deploys to GitHub Pages.

### Fixed

- The AVIF encoder was given its quality under the name `cqLevel`, which this
  version of the encoder ignores in silence. Every AVIF came out at the default
  quality and the slider did nothing. The type checker found it, and a test now
  guards it.

### Decided

- The name is Bitsmith. The launch address is
  `stiven-gjekaj.github.io/bitsmith`, on GitHub Pages. The domain
  `bitsmith.tools` is not registered, and section 4 of the plan records that
  risk.
- The host is GitHub Pages and not Cloudflare Pages. Section 6 of the plan
  records what that costs.
- Version 1 runs fully in the browser and holds five tools: a QR code
  generator, an image converter, a cropper and resizer, a PDF page tool, and a
  background remover.
- Version 1 costs nothing to build and nothing to run.
- Version 1 shows no advertisements and takes donations instead.
