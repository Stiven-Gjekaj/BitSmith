<div align="center">

# Bitsmith

### Small file tools that run fully in your browser

_No upload, no account, no server_

<p align="center">
  <img src="https://img.shields.io/badge/status-planning-D97706?style=for-the-badge" alt="The project is in the planning stage and has no application code yet"/>
  <img src="https://img.shields.io/badge/runs-in_your_browser-007ec6?style=for-the-badge" alt="Every tool runs on your own device, in the browser"/>
  <img src="https://img.shields.io/badge/server_cost-none-427819?style=for-the-badge" alt="The design uses no server, so it costs nothing to run"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"/>
  <img src="https://img.shields.io/badge/tools_built-0_of_5-lightgrey?style=flat-square" alt="None of the five planned tools is built yet"/>
</p>

<p align="center">
  <a href="#overview"><b>Overview</b></a> |
  <a href="#planned-tools"><b>Planned Tools</b></a> |
  <a href="#how-it-works"><b>How It Works</b></a> |
  <a href="#status"><b>Status</b></a> |
  <a href="docs/plan.md"><b>The Plan</b></a>
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

**This repository holds the plan. It does not hold the product yet.**
No application code is written.
Every decision that comes before the first line lives in
[docs/plan.md](docs/plan.md): the technology, the host, the build order, the
licence traps, and the money.

---

## Planned tools

<table>
<tr>
<td width="50%" valign="top">

### Version 1

- A QR code generator
- An image converter for PNG, JPEG, WebP, and AVIF
- An image cropper and resizer
- A PDF tool that merges, splits, and reorders pages
- A background remover for photographs

</td>
<td width="50%" valign="top">

### Later

- Video and audio conversion, with `ffmpeg.wasm`
- Office document conversion, which needs a server
- More conversion pairs as they earn their place

Each later tool changes what the project needs.
Section 18 of the plan gives the cost of each one.

</td>
</tr>
</table>

---

## How it works

**The browser does all of the work. No file goes to a server.**

This one rule decides almost everything else in the project.

| It gives | Because |
| -------- | ------- |
| A near zero running cost | There is no compute, no storage, and no upload bandwidth to pay for |
| A privacy claim that holds | Your file never leaves the device, so nobody can lose it or read it |
| No legal load | A site with no user files has almost no data protection duty |
| Free hosting that scales | Static files on a cache network serve one visitor or a million the same way |

Every tool falls into one of three tiers.
Version 1 builds tier 1 only.

| Tier | Where the work happens | What it needs |
| ---- | ---------------------- | ------------- |
| **1** | The device | Nothing special |
| **2** | The device | Cross-origin isolation, and no advertisements on that page |
| **3** | A server | A backend, and new legal duties |

### The stack

| Layer | Choice |
| ----- | ------ |
| Framework | Astro, which sends no JavaScript until a visitor needs it |
| Interactive parts | React islands, loaded only on a tool page |
| Language | TypeScript, strict mode |
| Styles | Tailwind CSS, and the system font stack |
| Heavy work | WebAssembly codecs, inside a Web Worker |
| Host | Cloudflare Pages, on the free plan |
| Tests | Vitest for the engines, Playwright for the browser |

---

## Status

Nothing is built.
The table below is the build order, and each step adds exactly one new hard
thing.

| Step | Work | The new hard thing | State |
| ---- | ---- | ------------------ | ----- |
| 0 | The shell, the page template, the tool registry | Nothing. It proves the pipeline. | Not started |
| 1 | QR code generator | The first complete tool, with no WebAssembly | Not started |
| 2 | Image converter | The first WebAssembly codec and the first worker | Not started |
| 3 | Image cropper and resizer | Nothing new. It proves the shell is general. | Not started |
| 4 | PDF merge, split, and reorder | A different file type in the same registry | Not started |
| 5 | Background remover | A large machine learning model in the browser | Not started |

The shell comes before any tool.
It is cheap to build once and expensive to retrofit ten times.

---

## Project structure

The tree below is the plan, and not the current state of this repository.
Only `docs/`, `AGENTS.md`, `LICENSE`, and this file exist today.

```
src/
  pages/         one route for each tool
  components/
    shell/       dropzone, progress, result, download
  tools/
    registry.ts  the manifest that generates routes, sitemap, and links
    qr-generate/
      engine.ts  pure functions, no browser API, unit tested
      Tool.tsx   the user interface
  lib/
    pipeline/    file in, worker, file out
    workers/
  content/
    tools/       the page text for each tool, in MDX
tests/
  fixtures/      sample files for the engine tests
  e2e/
docs/            the plan and the later decision records
```

Two ideas do most of the work.
The **tool registry** declares every tool once, then generates the route, the
home page card, the sitemap, the structured data, and the related links.
The split between **`engine.ts` and `Tool.tsx`** keeps the conversion logic pure,
so a test can run it in Node against a fixture file with no browser at all.

---

## Documentation

<table>
<tr>
<td align="center" width="25%" valign="top">
<h3>Plan</h3>
<p>Every decision made<br/>before the code</p>
<a href="docs/plan.md"><b>The Plan</b></a>
</td>
<td align="center" width="25%" valign="top">
<h3>Rules</h3>
<p>How an agent works<br/>in this repository</p>
<a href="AGENTS.md"><b>Agent Rules</b></a>
</td>
<td align="center" width="25%" valign="top">
<h3>Licence</h3>
<p>What you may do<br/>with this code</p>
<a href="LICENSE"><b>MIT</b></a>
</td>
<td align="center" width="25%" valign="top"></td>
</tr>
</table>

---

## Contributing

The project is in the planning stage, so the most useful contribution now is an
argument against a decision in [docs/plan.md](docs/plan.md).
Open an issue and say which section is wrong, and why.

Read [AGENTS.md](AGENTS.md) before you send a change.
It sets the rules for commits and for writing.
Two of them matter most: each commit holds one change only, and all text uses
Simplified Technical English.

---

## License

Released under the MIT License.
See [LICENSE](LICENSE) for the full text.

<div align="center">
<sub>The work happens on your device. Read <a href="docs/plan.md">the plan</a> to see how.</sub>
</div>
