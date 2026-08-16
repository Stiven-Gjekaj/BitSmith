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

- **The interface is rebuilt on ShadCN.** Buttons, cards, badges, inputs,
  alerts, and the select, slider and progress bar now come from Radix with
  ShadCN styling. The select is the one that matters beyond appearance: Radix
  manages focus, announces the chosen option, and handles arrow keys the same
  way in every browser, which the hand-written control only approximated.
- **The backdrop is three dimensional and drawn on the graphics card.** A field
  of points with perspective and parallax, in about a hundred lines of WebGL
  and two shaders. It is written here rather than embedded from a 3D service,
  because an embed would fetch a runtime and a scene from another company on
  every page load and every tool page promises that nothing does.
- **The crop can be dragged.** The tool asked for four numbers and showed the
  picture nowhere near them, which on a phone is close to unusable. The numbers
  remain, and the two stay in step.

### Added

- **Twelve conversion pages**, at addresses people actually search for, such as
  `/png-to-jpg`. Each opens the converter already pointed the right way and
  carries its own writing: why somebody wants that conversion, what it costs,
  and when to do something else. Measured vocabulary overlap between them is
  0.52, and a test fails if two pages ever pass 0.6.
- **Browser tests.** 66 across desktop and a phone, run in CI against the built
  site. This is the check that was missing when a background remover that hung
  for ever shipped with a green build.
- **Cookieless analytics**, off until somebody sets a token. Both choices avoid
  a consent banner, and the built page carries no third-party script while the
  settings are empty.

- **The background remover runs on the graphics card.** About six seconds
  becomes about one, with the same result. onnxruntime has two builds and
  neither is imported at the top: the engine picks one at run time, so a
  visitor fetches the 12.9 MB processor build or the 23.1 MB WebGPU build and
  never both. A browser with no adapter, or a card that refuses the model,
  falls back to the processor and says so on the page and in the console.
- **The plan is gone.** Every decision it recorded has shipped or now sits in
  a comment beside the thing it explains. What had not happened moved to
  `docs/milestones.md`: video, office documents, the money plan, the address,
  and the open questions. No source file references it, by design.
- **A new mark**, the anvil from Lucide under the ISC licence, with the text
  in `LICENSES/lucide.txt`. The header, the favicon, and `public/logo.svg` all
  use it.
- **Three stack badges** in place of one, and the title above them is gone
  because the mark carries the name.

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
