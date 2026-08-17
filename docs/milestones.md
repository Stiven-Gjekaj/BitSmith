<div align="center">
  <a href="../README.md"><b>Bitsmith</b></a>
</div>

# Milestones

Version 1 is built and live. This file holds what is not built.

It replaces the pre-development plan, which is finished. Every decision that
plan recorded has either shipped or is written into the code beside the thing
it explains. What remains is the work ahead, and it is here.

---

## The three tiers

Every tool belongs to one of three tiers. The tier decides what the tool needs
from the site, and version 1 is tier 1 only.

| Tier | Where the work happens | What it needs | State |
| ---- | ---------------------- | ------------- | ----- |
| **1** | The device | Nothing special | Ten tools, done |
| **2** | The device | Cross-origin isolation | Not started |
| **3** | A server | A backend, and new legal duties | Not started |

The central rule holds until a tool makes it impossible: **the browser does
all of the work, and no file goes to a server.** That rule is what makes the
site free to run, the privacy claim true, and the legal load almost nothing.
Break it only for tier 3, and only for the tools that need it.

---

## Tier 2: video and audio

Use `ffmpeg.wasm`. Set a strict file size limit, because the browser holds the
whole file in memory. Tell the visitor the conversion is slow before they
start it.

**The blocker is the host.** Fast video needs multi-threaded WebAssembly,
which needs `SharedArrayBuffer`, which a browser gives only to a page that is
cross-origin isolated. Isolation needs two response headers, and GitHub Pages
sends no custom header at all.

Two ways round it, and one that failed:

- **A service worker** can add the headers the host will not. This was built
  and it worked: the page reported `crossOriginIsolated` with
  `SharedArrayBuffer` available. onnxruntime then hung inside session creation
  every time, with no error to catch. It was withdrawn. It may still suit
  ffmpeg, which is a different library with different threading.
- **Move the host.** Cloudflare Pages sends custom headers, and it can put the
  two headers on the video routes alone with a `_headers` file. That keeps the
  rest of the site un-isolated, which matters because isolation breaks
  third-party embedding and therefore advertisements.
- **Accept single-threaded video.** No headers, no host change, and short
  clips still work.

Whichever way it goes, the page layout must keep rendering with no
advertisement slot. Version 1 gives that for free, because no page has one.

---

## Tier 3: office documents

Office conversion is not practical in a browser. This tier needs a server, and
a server changes the project. Budget for these, and not for the code alone:

- Compute for each conversion. This collides with low advertisement revenue,
  so consider a rate limit or a donation gate.
- Data protection duties, a retention policy, and a deletion policy.
- Abuse handling, because an open upload endpoint attracts illegal files.
- Monitoring, and an answer when the queue stops at night.

Keep the server narrow. Route the document tools to it and keep every other
tool on the device.

The engine interface already allows this. An engine takes bytes, reports
progress, and returns bytes, and that shape works the same for a worker and
for a network call. **Do not build the server abstraction now.** Only keep the
interface in that shape.

**The privacy claim is per tool, and this is why.** Each tool page says where
the file goes, and it says it from the `runsOn` field on the registry entry.
The day a tier 3 tool arrives, its page tells the truth on its own. A site-wide
promise in the footer would become a lie that needs hunting down.

---

## Money

**Version 1 takes donations and shows no advertisements.** That is not a
delay, it is the simpler product: advertisements need a paid domain, a consent
banner, a content review, and reserved page space, and version 1 needs none of
them.

Waiting also buys something. With no advertisement script, no third party sees
the visitor at all, and a Content Security Policy that allows only this site
proves it. No competitor who sells advertisements can say that.

### Advertisements, when three things are true

1. You own a real domain.
2. The site has enough written content to pass a review. Google usually
   rejects a thin site, so write the pages first and apply afterwards.
3. The traffic is high enough that the revenue pays for your time.

Then handle two traps.

**The model licence.** A site with advertisements is a commercial site, and
some strong background removal models carry a non-commercial licence. The
Bria RMBG models are the common example. This project uses u2netp under the
Apache 2.0 licence, which stays available. Read the licence text of any
replacement yourself.

**Isolation against advertisements.** The headers that fast video needs break
most advertisement scripts. The two features are in tension, and the way out
is to isolate single routes rather than the whole site.

### Expectations

Utility traffic earns a low rate for each thousand page views, because the
visitor wants to leave quickly and buys nothing. Large advertisement networks
set a traffic floor a new site does not meet. Donations on a free tool site
convert at a very low rate.

Plan for slow revenue and build for low cost. The browser-only design already
gives the low cost, and that is what lets the site survive with no income.

---

## The address

The site runs at `stiven-gjekaj.github.io/BitSmith`. The domain
`bitsmith.tools` is **not registered by you**, and nobody is holding it.

Moving is cheap now and expensive later. At low traffic the loss is near zero.
Redirect every old address to the new one and keep every path the same. Read
this again when search traffic starts.

A free subdomain also costs you an advertisement account. Google very probably
rejects an application from one, because you cannot prove that you own the
root domain. That does not block version 1, which shows no advertisements.

---

## Making the background remover faster

Done, and worth recording so nobody repeats the dead ends.

| Change | Result |
| ------ | ------ |
| The `wasm` entry point instead of the package root | 25.6 MB of runtime becomes 12.9 MB |
| Half precision model | 4.36 MB becomes 2.26 MB, and the mask is unchanged |
| The model loads as the page opens | The download leaves the critical path |
| The session is kept between runs | A second photograph does not rebuild it |
| **WebGPU, with the processor as the fallback** | **About six seconds becomes about one** |

Two things were tried and refused:

- **Int8 quantisation.** Smaller again at 1.29 MB, and faster, and it returns
  a mask that calls every pixel foreground. U-2-Net nests one encoder inside
  another and the activations cover a range int8 cannot hold. A test now
  compares the subject against the ground, so this cannot come back unnoticed.
- **Threads through a service worker.** See tier 2 above.

What is left is a browser with no graphics adapter, which still takes about
six seconds. Nothing cheap remains for that case.

---

## Which way up a photograph is

This was found by suspicion and settled by measurement, so the numbers are
here to stop anybody investigating it twice.

A camera held sideways does not usually turn the pixels. It writes them the
way the sensor read them and records the rotation in an Exif tag, and the
viewer turns the picture as it draws it. Measured before any fix:

| What was measured | Result |
| ----------------- | ------ |
| `decode()` of a JPEG with orientation 6 | 64 by 48, pixels byte for byte identical to the same file without the tag |
| Exif marker in `encode()` output | none |
| Any APP1 segment in `encode()` output | none |
| Orientation tag after the metadata remover ran | gone, output identical to a file that never had one |

So the decoder ignored the tag, the encoder wrote none back, and every tool
turned a portrait photograph on its side. The metadata remover was the worst
of the three, because its whole promise is that the picture is untouched, and
the pixels being untouched is precisely why the photograph came out sideways.

Two different fixes, because the tools work differently:

- Anything that decodes now turns the pixels to match the tag, once, at the
  point of decoding. The converter, the cropper and the rotate tool all
  inherit it.
- The metadata remover never decodes, so it writes back a 36 byte Exif block
  carrying only the orientation. Everything private still goes.

One trap is recorded here because a test walked into it. Applying the mirror
before the turn instead of after swaps the pictures for orientation 5 and 7
with each other. Both orders still give eight different pictures with the
right shapes, so the obvious tests pass either way. Only a named corner in a
known place can tell a reflection along one diagonal from the other.

## Why the browser suite used to time out

Solved. Recorded because the answer explains two separate faults that looked
unrelated, and because the shape of it will come back the next time a control
is added.

Astro renders the controls on the server, so they are in the page before any
JavaScript runs. They look finished and they are not: nothing typed into them
reaches React until the tool has mounted, and the tool sits behind a lazy
import, so it arrives after the page does. Measured gap between the control
appearing and React mounting:

| Machine speed | Control attached | React mounted | Gap |
| ------------- | ---------------- | ------------- | --- |
| Idle | 186ms | 231ms | 45ms |
| Six times slower | 319ms | 557ms | 238ms |
| Twenty times slower | 1006ms | 2066ms | 1060ms |

A test that typed inside that gap got a box holding its text and a run button
that never enabled, because the button is disabled on React's own idea of
whether the box is empty, and React's state was still the empty one it mounts
with. The test then waited ninety seconds and failed on whichever control it
was holding, which is why it looked like a different fault every run.

The trace of a real failure says it plainly: the button was found, and then
"element is not enabled", 168 times over.

The fix is a signal that cannot exist before React mounts, because it is set
from an effect and an effect does not run on the server. The wait sits in the
test helpers rather than in each test, because forgetting it does not fail
loudly. One spec had already forgotten it, and that is the spec the failures
kept landing on.

Confirmed by reproducing it deliberately: with the browser slowed twenty
times and the old wait in place, the button is still disabled after React has
mounted; with the new wait it is not.

This also explains the older defect recorded in `tests/e2e/pdf.spec.ts`,
where a test switched a mode and the mode reverted. That test is back and
passes.

What was ruled out first, so that nobody covers the ground again: memory, no
swap in use at all; processes left behind, none; the test server dying, it
was watched through a full run; the test server stalling, 480 concurrent
requests with none over 24ms; and file handles leaking in the test server,
which was real and is fixed but could not be the cause on a machine whose
limit is over a million.

## Open items

1. Set an analytics token in `src/site.config.ts`. The code is in place and
   both choices are cookieless, so no consent banner is needed. Until a token
   is set the site measures nothing, and nothing can be known about whether
   any of the work above is working.
2. Read the address section above again when search traffic starts.
3. Write more conversion pairs only where a real answer exists to the three
   questions the fourteen already answer. A pair that cannot be given one does
   not deserve a page, and thin pages lower the whole site.

Closed: WebP metadata stripping is done, so the tool now takes JPEG, PNG and
WebP. The git email is `stivenagostingjekaj@gmail.com` and is now pinned in
the repository configuration. The conversion pages use `/png-to-jpg`. HEIC is
read, under the LGPL terms recorded in the README, and the two pages for it
are live. The background remover has browser coverage.

---

## Two things that are deliberately not done

Both were looked at, both were measured, and both were left. They sit here
rather than in the open items above because neither is waiting for time or for
a decision. The decision is made. What is written down is the reasoning, so
that somebody arriving later does not spend a day rediscovering it.

Either could be reopened, and what would have to change is named in each case.

### Removing the metadata from an AVIF or a HEIC

The tool takes JPEG, PNG and WebP, and refuses the other two with a sentence
that says why.

The three that work are flat. A JPEG is a run of segments, a PNG is a run of
chunks, and a WebP is a RIFF container, so removing a piece means copying out
everything except that piece, and the picture data is never touched. WebP
already needed two steps beyond that, a flags byte and a container length, and
both were places to be quietly wrong.

AVIF and HEIC are not flat. Their metadata lives in `meta` boxes as items
described in `iinf`, referenced through `iref`, and found by byte offsets held
in `iloc`. Removing an item means rewriting the item tables and then every
offset that pointed past it. One wrong offset does not give an obviously
broken file. It gives a picture that some readers open and others refuse.

Against that: the number of people holding an AVIF with a location tag they
want gone is small, and they already have a route, which is to convert it here
first and clean the result.

**What would change the answer.** A library that does the rewriting, or a
measured demand for it. Not a spare afternoon. The failure here is a corrupted
picture handed back by the one tool whose whole promise is that it does not
touch the picture.

### Whether the copied pdfjs character maps earn their size

They stay, and the reason is narrower than it first appears.

pdfjs does not carry the standard fonts or the character maps inside its code.
It asks for them over the network from a folder the caller names, and
`scripts/copy-pdfjs.mjs` copies both into `public/` on every build. Measured:

| Folder | Size | Files |
| ------ | ---- | ----- |
| `cmaps` | 1.6 MB | 169 |
| `standard_fonts` | 800 KB | 16 |
| Together | 2.4 MB | 2 percent of the built site |

The measurement that decides it is what happens without them. The font folder
was pointed at a directory that does not exist, and a document naming
Helvetica without embedding it still drew its text, because pdfjs carries the
fourteen standard fonts itself. So for every document the tests cover, these
folders do nothing whatever.

They are kept for the documents the tests do not cover. A PDF holding
Japanese, Chinese, Korean, Arabic or Cyrillic text needs the character maps to
know which glyph a code point means, and without them that text does not
render. Nothing in the suite has such a document, so this is reasoning and not
measurement, and it is written as reasoning on purpose.

Keeping them costs 2.4 MB of build output and nothing at all to a visitor,
because a file is fetched only when a document asks for it. Dropping them
costs a PDF in a writing system the author cannot read coming out blank,
silently, with no error anywhere.

**What would change the answer.** One test with a document in a non-Latin
writing system, run with the maps removed. If the text still draws, the maps
go. Until somebody does that, 2.4 MB of build output is the cheaper side of
the bet.

---

## Search, which is the only channel

Search traffic is the only way visitors arrive, and it costs time rather than
money.

Give each tool its own address with real text on it, and title the page after
the task and not the brand. A visitor searches for "png to jpg", never for
"Bitsmith".

Generate the conversion pair pages from the registry, then write real text for
each one. Do not ship many pages that hold the same words with two swapped. A
search engine treats those as spam and can lower the whole site. Fewer good
pages beat many thin ones.
