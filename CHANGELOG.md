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

### Changed

- **The background model is half precision.** 4.36 MB becomes 2.26 MB with no
  loss: the mask separates subject from ground by 0.995 either way. Int8 was
  measured first and refused. It is smaller again and it does run faster, and
  it returns a mask that calls every pixel foreground, because U-2-Net nests
  encoders and the activations cover a range that int8 cannot hold.
  `scripts/make-model.py` does the conversion and records the numbers.
- **A logo.** `public/logo.svg`, drawn in the repository. The header mark and
  the favicon use the same geometry.
- **Fewer badges.** The tool count, the home page script size, and the server
  cost are gone. The stack and its versions are there instead, and the deploy
  badge reads "deployed".

- **A new look.** Dark by default, with a light palette for a visitor whose
  system asks for one. One token file holds every colour, so no component
  writes a hex value.
- **Movement.** A drifting pair of gradient orbs, a grid that fades at the
  edges, a light that follows the pointer, headings that carry the accent
  through them, and content that arrives in order. Everything except the
  pointer light is CSS, and all of it stops for a visitor who asks the system
  for less motion.
- **The home page now ships 216 bytes of JavaScript** rather than none. That
  is the pointer effect and nothing else. The readme badge and section 5 of
  the plan carried the old number and now carry the measured one.
- **Icons and a mark**, drawn in the repository rather than pulled from an
  icon set. Five icons is less code than a dependency, and each one inherits
  the accent colour and the stroke weight of the design.

### Fixed

- A broken model could pass the tests. The background remover was checked for
  a mask that is not flat, and a mask of pure noise is not flat either. The
  int8 model passed that check while being useless. There is now a test that
  compares the subject against the ground, and it was confirmed by putting the
  broken model back and watching it fail.
- Content that waited for a scroll observer could stay invisible if that
  observer never fired, which happened. The reveal is gone, and the entrance
  is now a CSS animation that cannot leave anything hidden.
- The main button failed contrast on the light palette, because dark text sat
  on a mid-tone gradient. It has its own pair of colours now.
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
