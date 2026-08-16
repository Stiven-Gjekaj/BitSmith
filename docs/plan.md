# Pre-development plan

This document records the decisions that come before the first line of
application code.
Each section gives a decision, the reason for it, and the risk that it
carries.
Version 1 costs no money. Section 3 proves this.
Open items are in the last section.

## 1. The product

The site gives small file tools to the general public.
A visitor arrives from a search engine.
The visitor has one file and one problem.
The visitor solves the problem in less than thirty seconds.
The visitor does not make an account.

The first tools are these:

- A QR code generator.
- An image converter for PNG, JPEG, WebP, and AVIF.
- An image cropper and resizer.
- A PDF tool that merges, splits, and reorders pages.
- A background remover for photographs.

## 2. The central rule

**The browser does all of the work. No file goes to a server.**

This rule is the foundation of every other decision in this document.
Keep this rule until a tool makes it impossible.

The rule gives four benefits:

- The cost to serve one more user is almost zero.
- The privacy claim is true, and a competitor cannot copy it cheaply.
- The site has no queue, no storage, and no upload bandwidth.
- The site has no user files to lose, to leak, or to police.

The rule also removes a large legal load.
A server that receives user files creates duties under data protection
law.
A server that stores user files attracts illegal content.
The browser-only design removes both problems.

Images and PDF files fit this rule well.
Video fits this rule with effort.
Office documents do not fit this rule at all.

You plan to add video and documents later.
Therefore treat the rule as a default and not as a law.
This plan puts every tool in one of three tiers.

| Tier | Where the work happens | What it needs | Examples |
|---|---|---|---|
| 1 | The device | Nothing special | QR codes, images, PDF pages, background removal |
| 2 | The device | Cross-origin isolation, and no advertisements on that page | Video and audio |
| 3 | A server | A backend, and new legal duties | Office documents |

Version 1 holds tier 1 tools only.
Section 7 and section 11 make tier 2 and tier 3 cheap to add later.
Build for tier 1 now, but block neither tier 2 nor tier 3.

The central rule is also what makes the budget in section 3 possible.
A browser-only site has no server bill, because it has no server.

## 3. The budget

**Version 1 costs nothing. This is not a compromise.**

Removing the advertisements from version 1 makes the product simpler,
faster, and more honest.
Section 11 gives the full argument.
The short form is here: advertisements need a paid domain, a consent
banner, a content review, and reserved page space.
Version 1 needs none of these things, so version 1 ships sooner.

### Every cost, and its free option

| Item | The usual cost | The free option | The cost of going free |
|---|---|---|---|
| Domain | 10 to 50 each year | `<name>.pages.dev` from Cloudflare | A weaker brand. Advertisements become very hard. See section 4. |
| Web hosting | 0 to 20 each month | Cloudflare Pages, free plan | None that matters to you |
| Large file hosting | Object storage fees | jsDelivr, or the Cloudflare R2 free plan | Size limits. Confirm them. See section 6. |
| Code hosting | 0 to 4 each month | GitHub, free plan | None |
| Continuous integration | Paid minutes | GitHub Actions, free for a public repository | A private repository gets a monthly quota instead |
| Analytics | 9 each month for Plausible | Cloudflare Web Analytics, or GoatCounter | Fewer reports. Both are enough for you. |
| Consent banner | Paid platforms exist | Not needed in version 1 | None. See section 13. |
| Error reports | Paid plans | None in version 1 | You debug from reports by users |
| Fonts | Licence fees | The system font stack | None. The system stack is also the fastest. |
| Icons | Icon set licences | Lucide, ISC licence | None |
| Machine learning models | Commercial licences | Open models with a permissive licence | You must read each licence. See section 12. |
| Libraries | Nothing | Everything in section 10 is MIT or Apache | None |
| Email address | Domain mail plans | A free mail account, and GitHub issues | Less professional, but it works |
| Donations | Platform fees | Ko-fi or GitHub Sponsors | Small processor fees on money received |
| Design | A designer | Tailwind, and your own time | Time instead of money |

The whole technology stack in section 5 is already free and open source.
No part of the build needs a paid tool.

### Make the repository public

A public repository unlocks free things:

- GitHub Actions runs without a minute quota.
- jsDelivr serves your large files from the repository at no cost.
- The `js.org` domain programme accepts open source projects.

The cost is that another person can copy your code.
This matters less than it appears.
The value of this kind of site is the search rank and the traffic.
The value is not the code, because the code is a thin layer over open
source libraries.

Decide this together with the licence in section 12.

### When to spend the first money

Spend nothing until one of these happens:

- The site gets steady traffic from search engines.
- You want to apply for an advertisement account.

Then buy a domain, and only a domain.
That single purchase is under 20 for a common top level domain.
Nothing else in this plan needs money before tier 3.

## 4. The name and the address

**The name is Bitsmith.**

| Item | Value | State |
|---|---|---|
| Product name | Bitsmith | Decided |
| Repository name | `bitsmith` | Decided |
| Launch address | `stiven-gjekaj.github.io/bitsmith` | Live now, on GitHub Pages. |
| Future domain | `bitsmith.tools` | Not registered. See the risk below. |

The old directory name `QRmachina` names the site after one tool of
many.
A visitor who wants a PDF tool does not trust a site named for QR codes.
Bitsmith names no single tool, so every tool fits under it.

The site is published from this repository by a workflow.
The name `bitsmith.pages.dev` is still free at Cloudflare and still matches,
so it stays available if the header limit in section 6 ever forces a move.

### Free addresses

| Address | How to get it | Comment |
|---|---|---|
| `<name>.pages.dev` | Cloudflare gives it with the site | Instant. Start here. |
| `<name>.js.org` | Send a pull request to the js.org repository | Free and real. The project must be open source and use JavaScript. |
| `<name>.is-a.dev` | Send a pull request to their repository | Free. Aimed at developers. |
| `<name>.eu.org` | Apply, then wait | Free. Approval takes weeks. |

Do not use a free top level domain from a reseller.
Those domains get revoked without warning.
They also carry a bad reputation with search engines, because senders of
spam use them.
A free subdomain from a trusted host is much safer.

### What a free address costs you

Be clear about the cost, because it is real.

- Google very probably rejects an advertisement application from a free
  subdomain, because you cannot prove that you own the root domain.
  Confirm the current policy before you plan around it.
- A free subdomain looks less serious to a visitor.
- You do not control the root domain, so you depend on the host.

None of this blocks version 1, because version 1 shows no
advertisements.

### Moving to a real domain later is cheap

Move before you have traffic and links.
At low traffic the loss is near zero.
Redirect every old address to the new one with a permanent redirect.
Keep every path the same.
The longer you wait, the more links point at the old address, and the
more the move costs.

### How the name was chosen

Two checks narrowed the field.
Read each check correctly, because each one measures a different thing.

**Check one: nameserver delegation on the domain.**
A domain with nameservers is registered.
A domain with no nameservers is **probably** free, but this is not
proof.
A registrar search is the only proof.
This check removed `sundry.tools`, `brisk.tools`, `whetstone.tools`,
`toolpile.com`, and every `.com` name in the list.

**Check two: the `pages.dev` subdomain.**
This check ran a random control name first.
The control did not resolve, so the check gives a true answer.
The same control did resolve on `js.org` and on `is-a.dev`.
Those two services answer every name that a person asks for.
Therefore a lookup on either one proves nothing.
Do not trust a lookup there.

Check two removed `sundries`, `utilo`, `gizmo`, `knack`, `nifty`,
`jiffy`, `pronto`, `whatsit`, and `trinket`.
Another person holds each of those names on `pages.dev`.

Three names passed both checks: `bitsmith`, `doodad`, and `doohickey`.

Two more names failed a different test, so avoid them.
A company named KitBash3D sells assets in a related market.
Oddjob is a character from a large film franchise.

A domain check is not a trademark check.
Search a trademark register before you buy `bitsmith.tools`.

### The accepted risk

You launch on `bitsmith.pages.dev`, and you do not buy the domain yet.
Therefore another person can register `bitsmith.tools` first.
The name is not reserved for you.
You accept this risk, and this plan records it.

The risk stays small while the site is small.
A rename costs almost nothing today, because no link points at the site.
The cost grows with every link that arrives.
Therefore read this decision again when search traffic starts.

### One weakness, and the answer to it

The word "bit" speaks to programmers.
Your visitor is not a programmer.
Your visitor wants to change a PNG file into a JPEG file.
The name gives that person no warmth, so the page text must give it.
Write each title and each first line for that visitor.
Do not write them for an engineer.
The brand name has almost no effect on search rank, because a visitor
searches for the task and not for the brand.

## 5. The technology

Every item in this table is free and open source.

| Layer | Choice | Reason |
|---|---|---|
| Framework | Astro | The pages are mostly static text with one heavy interactive part. Astro sends no JavaScript until the visitor needs it. |
| Interactive parts | React islands | You know React. Astro loads a React island only on the tool page, and only when the visitor needs it. |
| Language | TypeScript, strict mode | The engines move bytes between formats. Types catch format errors early. |
| Styles | Tailwind CSS | Fast for one developer. The build removes unused rules. |
| Fonts | The system font stack | It costs no money, it sends no bytes, and it needs no third party. |
| Icons | Lucide | ISC licence. The build keeps only the icons you use. |
| Package manager | pnpm | Fast, and it saves disk space. |
| Lint and format | Biome | One tool instead of two. |
| Unit tests | Vitest | It runs the pure engines in Node against fixture files. |
| End-to-end tests | Playwright | It drives a real browser, because the tools need real browser APIs. |
| Continuous integration | GitHub Actions | It runs the type check, the lint, and the unit tests on each push. |

Astro is the important choice here.
Search traffic is the only channel for this kind of site.
Search rank depends on page speed.
A page that sends no JavaScript loads fastest.
Astro gives that result by default, and React gives it only with care.

You write React components as usual.
Astro decides when the browser loads them.

The system font stack deserves a note.
A web font costs a download, a delay, and often a third party.
The system stack costs nothing on all three counts.
For a utility site, speed beats a custom typeface.

## 6. The host

**The site runs on GitHub Pages.**

This is a change from the first plan, which chose Cloudflare Pages.
The reason for the change is that the code already lives on GitHub, so one
workflow builds and publishes with no second account and no second service.
The address is `https://stiven-gjekaj.github.io/bitsmith/`.

Be clear about what the change costs, because two of these are permanent.

- **GitHub Pages sends no custom header.** Section 11 plans tier 2 video by
  putting cross-origin isolation on single routes through a `_headers` file.
  That method does not exist here. Fast multi-threaded video therefore needs a
  move to a host that sets headers, or it needs the slower single-threaded
  build. This is the largest cost, and it only arrives with tier 2.
- **A project site sits under a path.** The address carries `/bitsmith/`
  rather than a root. Two settings in `astro.config.mjs` must stay correct
  together, and a wrong one breaks every link on the live site while the build
  still passes. The deploy workflow checks the built pages for that path.
- **Jekyll runs by default and drops any directory that starts with an
  underscore.** Astro writes everything into `_astro/`. The file
  `public/.nojekyll` turns Jekyll off, and the deploy workflow refuses to
  publish without it.
- **The bandwidth is a soft limit, not an unmetered one.** Confirm the current
  terms if the traffic grows.

The model is committed to the repository rather than kept in object storage.
It is 4.5 MB, which is small enough that git does not suffer, and holding it
here is what lets the site serve it from its own address.

### The earlier choice, for the record

**Cloudflare Pages, on the free plan.**

The reason is bandwidth.
This site sends large binary files to each visitor.
A WebAssembly codec is several megabytes.
A background removal model is tens of megabytes.
Vercel and Netlify measure bandwidth and charge for it.
Cloudflare does not meter static asset bandwidth in the same way.
Confirm the current terms before you commit, because plans change.

Cloudflare gives two more free benefits:

- A global cache network is included.
- Cloudflare Web Analytics is free and uses no cookies.

### Where the large files go

**Warning: Cloudflare Pages limits the size of one file.**
A background removal model can exceed this limit.
Check the current limit before you build step 5 in section 9.

Three free answers exist. Test them in this order.

1. **Cloudflare R2, free plan.** It stores a set amount at no cost and
   charges nothing for outbound data. Confirm the current free amount.
2. **jsDelivr.** It serves files from a public GitHub repository or an
   npm package through a real global cache network, at no cost. It also
   limits file size, so confirm that limit.
3. **Split the model into parts.** Store each part under the Pages
   limit, then join the parts in the browser. Use this only if the first
   two fail.

Serve the large files from an address you control where you can.
Never load a model from a random third party at run time.
You need control of the cache headers, and the site must work if that
third party stops.
Put a content hash in each binary file name.
Then set a long cache lifetime and mark the file as immutable.

### Addresses

Use one canonical address.
Redirect every other address to it.
Choose one trailing slash rule in the Astro configuration and keep it.
A mixed rule creates duplicate pages in the search index.

## 7. The repository structure

```
.
  AGENTS.md
  README.md
  LICENSE
  .gitignore
  docs/
    plan.md
    decisions/           one file for each later decision
  public/
    models/              ignored by git. See .gitignore.
  src/
    pages/               one route for each tool
    layouts/
    components/
      shell/             dropzone, progress, result, download
      ui/
    tools/
      registry.ts        the manifest of all tools
      qr-generate/
        meta.ts          name, slug, input types, output types
        engine.ts        pure functions, no browser API
        engine.test.ts
        Tool.tsx         the user interface
      image-convert/
      image-crop/
      pdf-merge/
      bg-remove/
    lib/
      pipeline/          file in, worker, file out
      workers/
      seo/               sitemap and structured data
    content/
      tools/             the page text for each tool, in MDX
  tests/
    e2e/
    fixtures/            sample files for the engine tests
```

Two ideas in this tree do the most work.

**The tool registry.**
One file declares every tool.
An entry holds the slug, the title, the description, the accepted file
types, and a lazy import of the engine.
The registry then generates the route, the card on the home page, the
sitemap, the structured data, the search, and the related links.
To add a tool you add one entry, one text file, one engine, and one
component.
Nothing else changes.

Give each entry two more fields on the first day.
Both fields cost nothing now, and both save a rewrite later.

- `runsOn` holds the value `device` or `server`.
- `isolated` is true when the tool needs cross-origin isolation.

The `runsOn` field drives a badge on the tool page.
The badge tells the visitor where the file goes.
Section 11 explains why this small field matters.

The `isolated` field drives the response headers, and it hides the
advertisement slots on that route.
Section 11 explains that pair.

**The split between `engine.ts` and `Tool.tsx`.**
The engine takes bytes and returns bytes.
The engine touches no browser API and no React.
Therefore Vitest runs the engine in Node against a fixture file.
The component holds all of the user interface.
This split is what makes the tests in section 15 possible.

## 8. Build the shell first

Do not build a tool first.
Build the part that every tool shares.

The shell does these things:

1. It accepts a file from a drop, from a file button, and from a paste.
2. It checks the file type and the file size.
3. It starts a Web Worker and sends the file to it.
4. It shows progress while the worker runs.
5. It shows the result and offers a download.
6. It shows a clear message when the work fails.
7. It clears the file from memory when the visitor leaves.

Every tool then plugs into this shell.
The shell is cheap to build once and expensive to retrofit ten times.

Run all heavy work in a Web Worker.
A large image on the main thread freezes the page.
A frozen page loses the visitor and hurts the speed score.

## 9. The order of the first features

Each step adds exactly one new hard thing.
Do not skip a step.

| Step | Work | The new hard thing |
|---|---|---|
| 0 | The shell, the page template, the registry, the first deployment | Nothing. This proves the pipeline. |
| 1 | QR code generator | The first complete tool. It needs no WebAssembly, so it proves the shell alone. |
| 2 | Image converter for PNG, JPEG, WebP, AVIF | The first WebAssembly codec and the first worker. |
| 3 | Image cropper and resizer | Nothing new. It reuses step 2. This step proves the shell is general. |
| 4 | PDF merge, split, and reorder | A different file type in the same registry. |
| 5 | Background remover | A large machine learning model in the browser. This is the heaviest step. Do it last. |

Step 1 ships fastest and teaches the most.
Step 5 impresses the most and risks the most.
This order puts the risk at the end, after the shell is proven.

## 10. The libraries

Every library here is free.
Check the licence of each one before you use it.
Section 12 explains why the licence matters.

| Job | Library | Licence to confirm |
|---|---|---|
| QR code generation | `qrcode` or `qr-code-styling` | MIT |
| QR code reading | The native `BarcodeDetector`, with `jsQR` as the fallback | Apache 2.0 |
| Image codecs | The `@jsquash` modules from Squoosh | Mostly Apache 2.0 |
| Cropping | `cropperjs` or `react-image-crop` | MIT |
| PDF pages | `pdf-lib` | MIT |
| PDF preview | `pdfjs-dist` | Apache 2.0 |
| Background removal | U-2-Net or BiRefNet, as ONNX, run by `onnxruntime-web` | See section 12 |

Use the `@jsquash` modules and not one large image library.
Each module holds one codec.
The page then downloads only the codec that the visitor needs.
This also keeps each file under the host size limits in section 6.

## 11. Money

**Version 1 takes donations. Version 1 shows no advertisements.**

This is a change from the earlier plan, and it is an improvement.
Advertisements are not free to add.
They cost you these things:

- A paid domain, because a free subdomain very probably fails the
  application.
- A consent banner, and the speed and trust that the banner costs.
- A content review that you pass only after you write many pages.
- Reserved page space, which risks the layout score.
- A conflict with cross-origin isolation, which blocks fast video.

Version 1 avoids all five.

### What you gain by waiting

**The privacy claim becomes absolute.**
With no advertisement script, no third party sees the visitor at all.
A Content Security Policy that allows only your own address then proves
the claim.
The browser enforces the promise, so the promise is not just words.
No competitor with advertisements can make this claim.

**No consent banner.**
Section 13 gives the detail.

**No conflict with video.**
The header conflict in the next part disappears while you show no
advertisements.

### Donations

Set up one link. All of these cost nothing to start.

| Platform | Fee | Comment |
|---|---|---|
| GitHub Sponsors | No platform fee | Fits an open source repository. Needs approval and a payout account. |
| Ko-fi | No platform fee on the free plan | Fast to set up. Processor fees still apply. |
| Liberapay | No fee | Run by a non-profit. Smaller audience. |

None of these needs a server, so none of them breaks the central rule.

Set your expectations.
Donations on a free tool site convert at a very low rate.
Treat any donation as a gift and not as income.
The browser-only design already gives you a near zero running cost, so
the site survives with no income at all.
That is the point of the design.

### Advertisements, later

Add them when all three of these are true:

1. You own a real domain.
2. The site has enough written content to pass a review.
3. The traffic is high enough that the revenue pays for your time.

Then handle two traps.

**Trap one: the licence of the background removal model.**
Some strong models carry a non-commercial licence.
The Bria RMBG models are the common example.
A site with advertisements is a commercial site.
Therefore a non-commercial model is not available to you then.
Choose a permissive model now, so this trap never closes on you.
Read the current licence text yourself.
Do not trust a summary, including this one.

**Trap two: cross-origin isolation against advertisements.**
Fast video conversion needs multi-threaded WebAssembly.
Multi-threaded WebAssembly needs the `SharedArrayBuffer` object.
That object needs two strict response headers.
Those headers break most advertisement scripts.
Therefore one page cannot easily hold both fast video and
advertisements.

Solve this in the structure now, and not later.
Apply the two headers to single routes, and not to the whole site.
Cloudflare Pages reads a `_headers` file that matches a path pattern.
The video routes then get the headers, and every other route keeps its
advertisements.

This split works only if two things are true from the first day.

- The page layout can render with no advertisement slot. In version 1
  every page does this, because no page has advertisements at all.
- The registry says which tools need isolation. Section 7 adds that
  field.

Version 1 gives you the first condition for free.
Do not lose it later by building the layout around an advertisement
slot.

### The privacy claim

Write the privacy claim for each tool, and not for the site.
Do not put a site-wide promise in the footer.
You plan to add document conversion, and that tool needs a server.
On that day a site-wide promise becomes false.
Then you must edit every page, and a visitor who read the old promise
loses trust in you.
Drive the claim from the `runsOn` field instead.
Each tool then states the truth about itself, and the text corrects
itself when you add a tier 3 tool.

The true claim for a tier 1 tool in version 1 is this: your file stays
on your device, and nothing here contacts any other company.
Keep that claim true.
The day you add advertisements, weaken the wording to match.

## 12. Licences

Choose the repository licence now.
Section 3 gives a reason to make the repository public, because a public
repository unlocks free services.

A permissive licence such as MIT invites contributors and fits the free
services.
A closed repository protects the work but costs you those services.
You cannot easily close an open repository later, so decide before the
first public push.

Watch three licence risks in the dependencies:

- Ghostscript uses the AGPL licence. Avoid it for PDF compression.
- libvips uses the LGPL licence. The obligations are unclear when you
  send the compiled module to a browser. The `@jsquash` modules avoid
  this.
- HEIC files use the HEVC format, and HEVC carries patents. Treat HEIC
  as a separate decision and not as part of step 2.

For the background removal model, prefer a permissive licence even now.
Version 1 takes donations only, and the meaning of "non-commercial" is
unclear when a project takes donations.
A permissive model removes the question, so you never need the answer.

## 13. Privacy, analytics, and the law

The browser-only design keeps you out of most data protection duties.
Version 1 keeps you out of the rest.

**You probably need no cookie banner in version 1.**
The law requires consent for tracking that is not necessary.
Version 1 has no advertisement script.
Cloudflare Web Analytics and GoatCounter both work without cookies.
Therefore version 1 may need no banner at all.
Confirm this against your own analytics choice before launch, because
the answer depends on what that tool stores.

This is a real gain.
A banner costs speed, it costs trust, and it costs the first click of
every visitor.

Add a Content Security Policy.
In version 1, allow only your own address.
The policy then makes the privacy claim in section 11 hard to break by
accident, even by a future mistake.

Do not add error reporting in version 1.
An error report can carry a file name or a file path.
It also costs money above a small free amount.

Write a short privacy page and a short terms page before launch.
Both are free to write.

## 14. Search engine plan

Search is the only channel, and it costs nothing but time.

Give each tool its own address with real text on it.
A visitor searches for the task, such as "png to jpg".
Therefore the page title must match the task and not the brand.

Decide the address shape once.
Both `/png-to-jpg` and `/convert/png-to-jpg` work.
Changing this later costs search rank.

Generate the conversion pair pages from the registry.
Then write real text for each one.
Do not ship many pages that hold the same text with two words changed.
A search engine treats those pages as spam, and it may lower the whole
site.
Fewer good pages beat many thin pages.

Write a sitemap from the registry.
Add structured data from the registry.
Both are free and automatic once the registry exists.

## 15. Tests

Your `AGENTS.md` file sets the rules.
This design follows them.

Put fixture files in `tests/fixtures/`.
Commit those files.
A test reads a fixture.
A test never reads the site configuration, because you edit that file
often and the test would then fail for no reason.

Assert a property and not a byte.
Check that the output is a valid JPEG.
Check that the width is 800 pixels.
Do not compare the output to a stored byte sequence.
An encoder changes its output between versions, so a byte comparison
fails for the wrong reason.

Make each test able to fail.
Write a test that converts a PNG file to a JPEG file, and confirm that
the fixture is really a PNG file first.
A test that starts from a JPEG file and ends at a JPEG file proves
nothing.

Use Playwright for the shell.
Drop a real file, wait for the result, and download it.

GitHub Actions runs all of this at no cost on a public repository.

## 16. Limits to set now

Decide these numbers before you build, and show them in the interface.

- Set a maximum file size for each tool. Mobile Safari stops a tab that
  uses too much memory. A limit with a clear message beats a crash.
- Support the current versions of Chrome, Edge, Firefox, and Safari.
- Use WebGPU when the browser has it, and fall back to WebAssembly.
  Never require WebGPU, because Safari support is recent.
- Test each tool on a mid-range phone. Most visitors arrive on a phone.

## 17. Accessibility

Do this now, because it is cheap now and expensive later.

- Give the drop area a real file input as well. A keyboard user cannot
  drop a file.
- Move the focus to the result when the work finishes.
- Announce progress in a live region.
- Keep contrast high enough to pass the AA level.

## 18. After version 1

Version 1 ships tier 1 tools only, on a free address, with no
advertisements.
This section records what comes next, and what each step costs in money.

**Step one: a domain.** Under 20 each year.
Buy it when search traffic is steady.
Move the site before links point at the free address.

**Step two: advertisements.** No direct cost.
It needs the domain, the content, and a consent banner.
Section 11 gives the two traps.

**Step three: tier 2, video and audio.** No direct cost.
Use `ffmpeg.wasm`.
Apply cross-origin isolation to those routes only.
Accept that those pages show no advertisements.
Set a strict file size limit, because the browser holds the whole file
in memory.

**Step four: tier 3, office documents.** This step ends the zero cost
era.
A server has a real monthly bill, and the bill grows with use.
Budget for these items, and not for the code alone:

- Compute cost for each conversion. This cost collides with low
  advertisement revenue. Consider a rate limit or a donation gate.
- Data protection duties, a retention policy, and a deletion policy.
- Abuse handling, because an open upload endpoint attracts illegal
  files.
- Monitoring, and an answer when the queue stops at night.

Keep the server narrow.
Route the document tools to it, and keep every other tool on the device.

The engine interface already permits this.
An engine takes bytes, reports progress, and returns bytes.
That shape works the same for a worker and for a network call.
Therefore a tier 3 tool needs no change to the shell in section 8.
Do not build the server abstraction now.
Only keep the interface in that shape.

**Still out of scope, with no plan to add:**

- Accounts, sign in, and saved history.
- A public API.
- PDF compression with Ghostscript, because of the AGPL licence.
- Other languages. Reserve the `/[lang]/` path shape now, but write
  English only.

## 19. Open items for you

Section 4 closes the name question.
These items stay open.

1. Take `bitsmith.pages.dev` now. Another person can take the name at
   any hour, and the name is the launch address. This needs a free
   Cloudflare account and nothing else.
2. Choose the repository licence, and decide public or private. Section
   3 and section 12 both bear on this.
3. Choose the git email address. The repository now inherits
   `stivenagostingjekaj@gmail.com` from your global git configuration.
4. Confirm the Cloudflare file size limit, the R2 free amount, and the
   jsDelivr file size limit. Do this before step 5 in section 9.
5. Choose the background removal model, and read its licence text.
6. Decide the address shape for conversion pairs. Section 14 gives the
   choice.
7. Confirm that your analytics choice needs no consent banner.
8. Read the domain risk in section 4 again when search traffic starts.
