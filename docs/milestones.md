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
| **1** | The device | Nothing special | Five tools, done |
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

The site runs at `stiven-gjekaj.github.io/bitsmith`. The domain
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

## Open items

1. Set an analytics token in `src/site.config.ts`. The code is in place and
   both choices are cookieless, so no consent banner is needed. Until a token
   is set the site measures nothing, and nothing can be known about whether
   any of the work above is working.
2. Read the address section above again when search traffic starts.
3. Write more conversion pairs only where a real answer exists to the three
   questions the twelve already answer. A pair that cannot be given one does
   not deserve a page, and thin pages lower the whole site.

Closed: the git email is `stivenagostingjekaj@gmail.com` and is now pinned in
the repository configuration. The conversion pages use `/png-to-jpg`.

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
