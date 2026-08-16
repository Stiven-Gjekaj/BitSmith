<div align="center">

<img src="https://raw.githubusercontent.com/Stiven-Gjekaj/bitsmith/main/public/logo.svg" alt="Bitsmith" width="112">

### Small file tools that run fully in your browser

_No upload, no account, no server_

<p align="center">
  <img src="https://img.shields.io/badge/Astro-7.2-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro 7.2"/>
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19.2"/>
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 6.0"/>
</p>

<p align="center">
  <a href="https://github.com/Stiven-Gjekaj/bitsmith/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Stiven-Gjekaj/bitsmith/ci.yml?label=ci&style=flat-square" alt="CI"/></a>
  <a href="https://github.com/Stiven-Gjekaj/bitsmith/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/Stiven-Gjekaj/bitsmith/deploy.yml?label=deployed&style=flat-square" alt="Deployed"/></a>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"/>
</p>

<p align="center">
  <a href="https://stiven-gjekaj.github.io/bitsmith/"><b>Use it in your browser</b></a> |
  <a href="#the-tools"><b>Tools</b></a> |
  <a href="#quick-start"><b>Quick Start</b></a> |
  <a href="#how-it-works"><b>How It Works</b></a> |
  <a href="#project-structure"><b>Structure</b></a>
</p>

</div>

---

## Overview

**Bitsmith** gives small file tools to anybody who needs one.
You open a page, you drop a file, and the work happens in your browser.
The file stays on your device.
Nothing travels to a server, because there is no server.

Most tools of this kind send your file to a company, do the work there, and
send it back.
That design costs money to run, so it needs advertisements or an account.
It also means a stranger holds your file for a while.
Bitsmith moves the work to the browser instead, which removes the bill, the
account, and the stranger at the same time.

The site is static files on GitHub Pages.
The ten tools together cost nothing to run and nothing to serve.

---

## The tools

<table>
<tr>
<td width="50%" valign="top">

### What they do

- **[QR code generator](https://stiven-gjekaj.github.io/bitsmith/qr-code-generator/)**
  turns a link or a note into an SVG or a PNG.
- **[Image converter](https://stiven-gjekaj.github.io/bitsmith/image-converter/)**
  moves a picture between PNG, JPEG, WebP and AVIF, and reads the HEIC an
  iPhone writes.
- **[Compress image](https://stiven-gjekaj.github.io/bitsmith/compress-image/)**
  makes a picture fit inside a size an upload form allows.
- **[Remove photo metadata](https://stiven-gjekaj.github.io/bitsmith/strip-metadata/)**
  takes out the place, the date and the camera, without rebuilding the picture.
- **[Rotate and mirror](https://stiven-gjekaj.github.io/bitsmith/rotate-image/)**
  turns a picture the right way up.
- **[Crop and resize](https://stiven-gjekaj.github.io/bitsmith/crop-image/)**
  cuts a picture down, then changes its size.
- **[PDF to image](https://stiven-gjekaj.github.io/bitsmith/pdf-to-image/)**
  gives one numbered picture for each page.
- **[Image to PDF](https://stiven-gjekaj.github.io/bitsmith/image-to-pdf/)**
  puts pictures into one document, a page each.
- **[Merge and split PDF](https://stiven-gjekaj.github.io/bitsmith/merge-pdf/)**
  joins files, or keeps the pages you name.
- **[Background remover](https://stiven-gjekaj.github.io/bitsmith/remove-background/)**
  cuts the background out of a photograph.

</td>
<td width="50%" valign="top">

### How they behave

- Every tool runs on your device, and the page says so.
- The heavy work runs in a Web Worker, so the page never freezes.
- WebAssembly codecs do the decoding and the encoding.
- Each tool downloads only its own code. Opening the QR page fetches no PDF
  library and no model.
- Every tool refuses a file that is too large, and says why, rather than
  letting the tab run out of memory.
- A drop area is not the only control. Each one carries a real file input, so
  a keyboard and a phone both work.

</td>
</tr>
</table>

---

## Quick Start

Use the site at
**[stiven-gjekaj.github.io/bitsmith](https://stiven-gjekaj.github.io/bitsmith/)**.
There is nothing to install.

To run it yourself, you need Node 22 and pnpm:

```
git clone https://github.com/Stiven-Gjekaj/bitsmith
cd bitsmith
pnpm install
pnpm dev
```

Build the site the way the deployment does:

```
pnpm build
```

Run everything that CI runs, in one command:

```
pnpm verify
```

---

## How it works

**The browser does all of the work. No file goes to a server.**

This one rule decides almost everything else.

| It gives | Because |
| -------- | ------- |
| A running cost of nothing | There is no compute, no storage, and no upload bandwidth to pay for |
| A privacy claim that holds | Your file never leaves the device, so nobody can lose it or read it |
| No legal load | A site with no user files has almost no data protection duty |
| Work that scales for free | Static files on a cache network serve one visitor or a million the same way |

### The path a file takes

```
your file
  -> the drop area checks its type and size
  -> a Web Worker starts, and imports only that tool's engine
  -> a WebAssembly codec decodes it to raw pixels
  -> the engine does the work and reports progress
  -> a codec encodes the result
  -> a download link appears, and the browser frees the bytes afterwards
```

### The stack

| Layer | Choice |
| ----- | ------ |
| Framework | Astro, which sends no JavaScript until a visitor needs it |
| Interactive parts | React islands, loaded only on a tool page |
| Language | TypeScript, strict mode |
| Styles | Hand-written CSS on a token palette, and the system font stack |
| Image codecs | The `@jsquash` modules from Squoosh, one per format |
| HEIC reading | `libheif`, through `libheif-js`, fetched only when a HEIC arrives |
| PDF writing | `pdf-lib` |
| PDF drawing | `pdfjs-dist` |
| Background removal | `u2netp` at half precision, through `onnxruntime-web` |
| Tests | Vitest for the engines in Node, Playwright for the browser |
| Host | GitHub Pages, deployed by a workflow |

The home page sends **216 bytes of JavaScript**, inline, and nothing else.
That one handler moves the light that follows the pointer. Everything else
that moves is CSS, so the compositor does it and the main thread stays free.
A tool page sends the shell and that one tool on top of this.

---

## Project structure

Two ideas carry the design.

**The tool registry.**
[`src/tools/registry.ts`](src/tools/registry.ts) declares every tool once.
From that one entry come the route, the card on the home page, the page title,
the sitemap, the structured data, and the related links at the foot of each
page.
Adding a tool means one entry, one engine, one component, and nothing else.

**The split between the engine and the interface.**
An engine takes bytes, reports progress, and returns bytes.
It touches no browser API and no React.
That is the only reason a test can run it in Node, and it is also why a tool
that needs a server later can arrive without changing the shell.

| Area | Files | Lines | Responsibility |
| ---- | ----- | ----- | -------------- |
| **Library** | `src/lib/` | 957 | Codecs, Exif, transforms, the worker pipeline, the engine contract |
| **Shell** | `src/components/` | 1832 | Drop area, progress, results, form fields, backdrop, icons |
| **Tools** | `src/tools/` | 3525 | The registry, ten engines, ten interfaces, the conversion pages |
| **Pages** | `src/pages/`, `src/layouts/` | 300 | Routes, page shell, metadata |
| **Styles** | `src/styles/global.css` | 254 | The token palette, the animations, the shell classes |
| **Total** | **62 files** | **6868** | Not counting 3155 lines of tests |

```
src/
  lib/
    image/codecs.ts      decode and encode, and sniffing a format from bytes
    pipeline/            the engine contract, and running one in a worker
    workers/             one worker that loads any engine on demand
  components/shell/      drop area, progress, results, shared form fields
  tools/
    registry.ts          the manifest that generates everything else
    qr-generate/         engine.ts, engine.test.ts, Tool.tsx
    image-convert/
    image-crop/
    pdf-pages/
    bg-remove/
  pages/                 the home page, and one route for every tool
public/
  models/u2netp-fp16.onnx  2.3 MB, served from this site and not a third party
tests/
  fixtures/              committed pictures that the engine tests read
  setup/codecs.ts        hands the codecs their WebAssembly in Node
scripts/
  check-links.sh         every relative link in the documentation
  make-fixtures.mjs      run by hand when a new fixture is needed
```

---

## Testing

```
pnpm vitest run
```

55 tests across 6 files, and none of them needs a browser.
The engines are pure, so Vitest runs them in Node against the committed
fixtures in `tests/fixtures/`.

Three rules shape these tests, and each one comes from a way a test can lie.

**A test states its input before it trusts it.**
The converter test checks that the fixture really starts with the PNG
signature before it converts it to a JPEG.
A test that starts at JPEG and ends at JPEG proves nothing, and a reader
cannot see that from the assertion.

**A test asserts a property, not a byte.**
It checks that the output decodes, and that the width is the number that was
asked for.
An encoder changes its output between versions, so a byte comparison fails for
a reason that has nothing to do with this project.

**A test has to be able to fail.**
The AVIF quality test exists because an older encoder took that option under
another name.
Passing the wrong name is ignored in silence: the file is valid, the size is
right, and the slider does nothing.
Only a comparison between two qualities can see it.
That test was checked by putting the fault back and watching it fail.

---

## Deployment

A push to `main` builds the site and publishes it to GitHub Pages.
The workflow is [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Two checks run before it publishes, because both failures are invisible
otherwise:

- The built pages must contain the `/bitsmith/` asset path. GitHub Pages
  serves a project site under a path. If that base is wrong, every page still
  builds and every link on the live site is broken.
- `dist/.nojekyll` must exist. GitHub Pages runs Jekyll by default, and Jekyll
  drops any directory whose name starts with an underscore. Astro puts
  everything in `_astro/`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), follow the
[Code of Conduct](CODE_OF_CONDUCT.md), and read [SUPPORT.md](SUPPORT.md) if you
need help.
[AGENTS.md](AGENTS.md) sets the rules for commits and for writing.
The [changelog](CHANGELOG.md) records what changed.

[docs/milestones.md](docs/milestones.md) holds the work that is not built yet:
video, office documents, the money plan, and the open questions.

---

## License

Released under the MIT License.
See [LICENSE](LICENSE) for the full text, and [TERMS.md](TERMS.md) for the
project terms.

The background removal model is `u2netp`, from the U-2-Net work, under the
Apache 2.0 licence, converted to half precision by `scripts/make-model.py`.
The anvil mark comes from [Lucide](https://lucide.dev) under the ISC licence,
and that text is in [LICENSES/lucide.txt](LICENSES/lucide.txt).

HEIC files are read with [libheif](https://github.com/strukturag/libheif),
through [libheif-js](https://github.com/catdad-experiments/libheif-js), under
the LGPL version 3. That text is in
[LICENSES/libheif.txt](LICENSES/libheif.txt). This licence is heavier than the
MIT and Apache terms that cover everything else here, and it is carried on
purpose: libheif is the only way to read a HEIC in a browser, and a HEIC is
what an iPhone writes by default. It is served as its own file rather than
folded in with the other code, so it stays a separate and replaceable part,
which is what the LGPL asks for.
Confirm both yourself before you use this project commercially. A model
licence is the trap worth checking, because several strong ones forbid
commercial use.

<div align="center">
<sub>The work happens on your device. <a href="https://stiven-gjekaj.github.io/bitsmith/">Try it</a>.</sub>
</div>
