import type { DecodableFormat, EncodableFormat } from "../../lib/image/codecs";

/**
 * One page for each pair of formats.
 *
 * A visitor searches for the task and not for the tool. Nobody types "image
 * converter"; they type "png to jpg". These pages exist to be that answer.
 *
 * Every pair carries its own writing, and that is the whole point. A search
 * engine treats a set of pages that share their words with two swapped as
 * spam, and it can lower the whole site for it. So each entry below says
 * something true about that particular pair: why a person wants it, what the
 * change costs, and when not to do it. If a new pair cannot be given a real
 * answer to those three, it does not deserve a page.
 */

export interface Pair {
  /** The address. Written the way a person searches, so `jpg` and not
   *  `jpeg`. */
  slug: string;
  /** What arrives. May be a format this project only reads, such as HEIC. */
  from: DecodableFormat;
  /** What leaves. Narrower than `from` on purpose: a pair that asks for a
   *  HEIC to be written will not compile. */
  to: EncodableFormat;
  /** How the source is named in a sentence. */
  fromLabel: string;
  toLabel: string;
  /** One line under the heading. */
  tagline: string;
  /** Why somebody wants this, in their own terms. */
  why: string;
  /** What the change costs. Every conversion costs something. */
  cost: string;
  /** When to do something else instead. */
  caution: string;
}

const PNG = "PNG";
const JPG = "JPG";
const WEBP = "WebP";
const AVIF = "AVIF";
const HEIC = "HEIC";
const GIF = "GIF";

export const pairs: Pair[] = [
  {
    slug: "png-to-jpg",
    from: "png",
    to: "jpeg",
    fromLabel: PNG,
    toLabel: JPG,
    tagline: "Make a screenshot or a drawing small enough to send.",
    why:
      "A PNG keeps every pixel exactly, which is why screenshots and exported " +
      "drawings arrive so large. A JPG throws away detail that an eye does " +
      "not notice, and a photograph or a screenshot of a photograph often " +
      "comes out five or ten times smaller. Mail systems and older upload " +
      "forms also accept JPG everywhere, which is not true of newer formats.",
    cost:
      "A JPG cannot hold a clear background. Anything transparent in the PNG " +
      "turns solid, and this tool fills it with black. A JPG also loses a " +
      "little more each time it is saved, so keep the PNG if you plan to edit " +
      "the picture again.",
    caution:
      "Do not use JPG for a logo, a diagram, or a screenshot of text. Sharp " +
      "edges pick up a grey fuzz that gets worse at lower quality. Convert " +
      "those to WebP instead, which stays sharp and is still much smaller " +
      "than PNG.",
  },
  {
    slug: "jpg-to-png",
    from: "jpeg",
    to: "png",
    fromLabel: JPG,
    toLabel: PNG,
    tagline: "Get a lossless copy that survives editing.",
    why:
      "A PNG stores the picture exactly as it is given, so every later save " +
      "leaves it unchanged. That matters when a picture is about to be " +
      "cropped, retouched, or pasted into a design several times over. Some " +
      "printing and design tools also refuse a JPG outright.",
    cost:
      "The file gets larger, often several times larger, because nothing is " +
      "thrown away any more. It also does not undo what the JPG already lost. " +
      "The blur and the blocks around sharp edges are part of the picture now, " +
      "and a PNG preserves them faithfully.",
    caution:
      "Converting a photograph to PNG just to store it wastes space and gains " +
      "nothing. Do it when the picture is going to be edited, and not as a way " +
      "to improve one that is already saved.",
  },
  {
    slug: "png-to-webp",
    from: "png",
    to: "webp",
    fromLabel: PNG,
    toLabel: WEBP,
    tagline: "Shrink a picture for a website and keep the clear background.",
    why:
      "WebP is the format that does what PNG does and takes far less room. It " +
      "keeps a transparent background, it keeps text and sharp lines crisp, " +
      "and a screenshot or a logo often lands at a quarter of the size. Every " +
      "current browser reads it, which is why it is the usual answer for a " +
      "picture on a web page.",
    cost:
      "At a lower quality setting WebP does lose detail, so a picture destined " +
      "for print should be converted at a high setting or left as PNG. Some " +
      "older desktop software still refuses to open it.",
    caution:
      "If the picture is going to somebody who will open it in an old program, " +
      "send PNG or JPG. WebP is for the web, and it is very good there.",
  },
  {
    slug: "jpg-to-webp",
    from: "jpeg",
    to: "webp",
    fromLabel: JPG,
    toLabel: WEBP,
    tagline: "Make a photograph smaller without it looking worse.",
    why:
      "WebP holds a photograph at roughly a quarter to a third less than JPG " +
      "for the same appearance. On a page full of photographs that is the " +
      "difference between a site that feels quick and one that does not, and " +
      "page speed is something search engines measure.",
    cost:
      "The picture is decoded and encoded again, so a little of what the JPG " +
      "kept is lost a second time. Converting at a high quality setting keeps " +
      "that invisible. Converting an already poor JPG will not rescue it.",
    caution:
      "Do not convert back and forth between JPG and WebP repeatedly. Each " +
      "round costs a little detail, and the losses add up in a way that is " +
      "obvious once it is too late.",
  },
  {
    slug: "webp-to-png",
    from: "webp",
    to: "png",
    fromLabel: WEBP,
    toLabel: PNG,
    tagline: "Open a downloaded WebP in a program that refuses it.",
    why:
      "This is the most common reason anybody converts anything. A picture " +
      "saved from a website arrives as WebP, and then a document editor, an " +
      "older photo tool, or a printing service will not take it. PNG is read " +
      "by everything, and it keeps the clear background that WebP files often " +
      "have.",
    cost:
      "The file gets larger, sometimes several times larger. Nothing else " +
      "changes: the picture is stored exactly as it arrived.",
    caution:
      "If the picture is a photograph and the size matters more than the " +
      "transparency, convert it to JPG instead. It will be far smaller and no " +
      "program will refuse it either.",
  },
  {
    slug: "webp-to-jpg",
    from: "webp",
    to: "jpeg",
    fromLabel: WEBP,
    toLabel: JPG,
    tagline: "Turn a downloaded picture into the format everything accepts.",
    why:
      "A photograph saved from a website is usually WebP now, and JPG is the " +
      "format that every upload form, every printing service, and every " +
      "elderly program still takes. For a photograph the JPG is also small, so " +
      "little is lost by going this way.",
    cost:
      "Any transparent area becomes solid, filled here with black. The picture " +
      "is also compressed again, so a very low quality setting will show.",
    caution:
      "If the WebP has a clear background that you want to keep, convert it to " +
      "PNG instead. JPG has no way to record transparency at all.",
  },
  {
    slug: "png-to-avif",
    from: "png",
    to: "avif",
    fromLabel: PNG,
    toLabel: AVIF,
    tagline: "Get the smallest file a browser can still read.",
    why:
      "AVIF is the smallest of these formats by a wide margin, often half of " +
      "WebP for the same appearance, and it keeps a transparent background. " +
      "For a picture that will be served to many people, the saving is real " +
      "bandwidth and a faster page.",
    cost:
      "Encoding is slow. A large picture takes seconds in the browser rather " +
      "than an instant, because the format works harder to get small. Support " +
      "is good in current browsers and absent in old ones.",
    caution:
      "Do not use AVIF for a file you are sending to a person rather than " +
      "serving from a page. Many programs still do not open it. WebP is the " +
      "safer small format.",
  },
  {
    slug: "jpg-to-avif",
    from: "jpeg",
    to: "avif",
    fromLabel: JPG,
    toLabel: AVIF,
    tagline: "Halve a photograph again, for a page that must be fast.",
    why:
      "AVIF holds a photograph at roughly half the size of a JPG that looks " +
      "the same. On a gallery or a shop that is the single largest change " +
      "available to page speed, and it needs no change to the picture itself.",
    cost:
      "Encoding takes real time, and the picture loses a little more on the " +
      "way through. Serve AVIF with a JPG or WebP fallback if any of your " +
      "visitors use old browsers.",
    caution:
      "This is a format for serving, not for sending. If somebody has to open " +
      "the file in a program, give them the JPG.",
  },
  {
    slug: "avif-to-jpg",
    from: "avif",
    to: "jpeg",
    fromLabel: AVIF,
    toLabel: JPG,
    tagline: "Open an AVIF in something that has never heard of it.",
    why:
      "AVIF is new enough that plenty of software refuses it, and a picture " +
      "saved from a modern website is increasingly this format. JPG is the " +
      "opposite: nothing refuses it. This is the conversion that makes a file " +
      "usable again.",
    cost:
      "The file grows, often to twice the size or more, and a transparent " +
      "background becomes solid black. The visible detail is kept.",
    caution:
      "Keep the AVIF if you are also publishing the picture. It is the better " +
      "file to serve, and the JPG is only the copy that travels.",
  },
  {
    slug: "avif-to-png",
    from: "avif",
    to: "png",
    fromLabel: AVIF,
    toLabel: PNG,
    tagline: "Convert an AVIF and keep the clear background.",
    why:
      "PNG is the format that both opens everywhere and holds transparency, " +
      "which makes it the right destination for an AVIF logo, icon, or cut-out " +
      "that a design program will not read.",
    cost:
      "The file gets much larger. AVIF is built to be small and PNG is built " +
      "to be exact, so the change of format is a change of purpose.",
    caution:
      "For a photograph with no transparency, JPG is a better destination. It " +
      "opens just as widely and is a fraction of the size.",
  },
  {
    slug: "webp-to-avif",
    from: "webp",
    to: "avif",
    fromLabel: WEBP,
    toLabel: AVIF,
    tagline: "Squeeze a web picture down one more step.",
    why:
      "Both formats are meant for the web, and AVIF is the smaller of the two, " +
      "commonly by a third to a half. If you already serve WebP and want the " +
      "page lighter still, this is the step, and transparency survives it.",
    cost:
      "Encoding is noticeably slower, and the picture is compressed a second " +
      "time. Convert at a high quality setting so the second pass does not " +
      "show.",
    caution:
      "The gain is only worth having if you serve the file to many people. For " +
      "a handful of pictures the WebP is already small enough.",
  },
  {
    slug: "gif-to-png",
    from: "gif",
    to: "png",
    fromLabel: GIF,
    toLabel: PNG,
    tagline: "Keep a GIF drawing sharp, and keep its clear background.",
    why:
      "A GIF is usually a drawing, a logo, or a piece of a screen, and those " +
      "are the things PNG was built for. Both keep an edge crisp instead of " +
      "smearing it, and both can hold a see through background, so a badge " +
      "that sat on a web page will still sit on one after the change. PNG is " +
      "also the format a design tool will open without complaint, which a " +
      "GIF is not always.",
    cost:
      "The file usually grows. A GIF is held to 256 colours and a PNG is " +
      "not, so the PNG carries more information even when the picture looks " +
      "the same. Where a GIF had a background that was either fully there or " +
      "fully gone, the PNG keeps that exactly, with none of the jagged " +
      "outline that a GIF gets around a curve.",
    caution:
      "Only the first picture survives. If the GIF moves, what you get is " +
      "the moment it starts on and nothing after it, because a PNG holds one " +
      "picture and has nowhere to put the rest. Keep the GIF if the movement " +
      "was the point.",
  },
  {
    slug: "gif-to-jpg",
    from: "gif",
    to: "jpeg",
    fromLabel: GIF,
    toLabel: JPG,
    tagline: "Turn a GIF into the one format every form accepts.",
    why:
      "Some upload boxes take a JPG and nothing else: a job application, a " +
      "printing service, an older shop system. A photograph that somebody " +
      "saved as a GIF, which happens more than it should, belongs as a JPG " +
      "anyway, because that is the format built for a photograph and the one " +
      "that will be a sensible size.",
    cost:
      "Two things go at once. Any see through area turns solid, and this " +
      "tool fills it with black, so a logo made to sit on a coloured page " +
      "will arrive in a box. Detail is also thrown away to make the file " +
      "small, and the banding a GIF already has from its 256 colours does " +
      "not survive that kindly.",
    caution:
      "Think twice for anything with a hard edge or lettering. JPG puts a " +
      "grey haze around sharp lines, and a GIF is usually made of sharp " +
      "lines. PNG is the better destination for a drawing, and it is one " +
      "click away.",
  },
  {
    slug: "gif-to-webp",
    from: "gif",
    to: "webp",
    fromLabel: GIF,
    toLabel: WEBP,
    tagline: "Make a GIF far smaller for a web page.",
    why:
      "This is the change that saves the most bandwidth. WebP holds the same " +
      "sharp edges and the same see through background as a GIF, in a " +
      "fraction of the bytes, and every browser released in the last several " +
      "years opens one. For anything that will be served to a lot of people, " +
      "that saving is real money and a page that appears sooner.",
    cost:
      "WebP can hold an animation and this conversion does not give it one. " +
      "That is the sharpest loss on this page: the format could have carried " +
      "the movement, and what is written here is the first picture only. " +
      "Some older desktop software also still refuses to open a WebP.",
    caution:
      "Keep the GIF as well if the thing has to play somewhere you do not " +
      "control, such as an email, a chat window, or a forum that rewrites " +
      "what you upload. A still WebP in place of a moving GIF is a poor " +
      "surprise for a reader.",
  },
  {
    slug: "gif-to-avif",
    from: "gif",
    to: "avif",
    fromLabel: GIF,
    toLabel: AVIF,
    tagline: "Squeeze a GIF as small as it will go.",
    why:
      "AVIF is the smallest of everything offered here, and a GIF is one of " +
      "the least efficient things you can start from, so the difference is " +
      "usually dramatic. Reach for this when the picture is going somewhere " +
      "you control, a page you built or an app you ship, and the only thing " +
      "that matters is how few bytes cross the wire.",
    cost:
      "Time. Writing an AVIF is slow next to the others, and you will wait " +
      "seconds for anything large, which is why this is a poor choice for a " +
      "batch. Support is also the narrowest here, so an older phone or an " +
      "office desktop that is behind may show nothing at all.",
    caution:
      "Do not send an AVIF to another person and expect it to open. It is a " +
      "format for a place you control, not for an attachment. Send WebP, or " +
      "send a JPG if you have no idea what will be at the other end.",
  },
  {
    slug: "heic-to-jpg",
    from: "heic",
    to: "jpeg",
    fromLabel: HEIC,
    toLabel: JPG,
    tagline: "Open an iPhone photograph on a machine that refuses it.",
    why:
      "An iPhone has saved photographs as HEIC since iOS 11, and almost " +
      "nobody chose that setting. The trouble turns up somewhere else: a " +
      "Windows desktop, an Android handset, a print shop counter, an " +
      "insurance claim form, or an older upload box that answers with " +
      '"unsupported file". JPG is the one every single one of those takes ' +
      "without argument. This is the conversion that makes a camera roll " +
      "usable away from the phone that filled it.",
    cost:
      "The JPG is usually the larger file, sometimes twice the size, because " +
      "HEIC compresses far better than a format from 1992. Whatever the HEIC " +
      "carried besides the picture is dropped as well: the depth map that " +
      "portrait mode records, and the short piece of video that makes a Live " +
      "Photo move. The still picture is what survives.",
    caution:
      "Keep the original in the camera roll. This street runs one way. " +
      "Writing a HEIC needs an HEVC encoder covered by patents, so nothing " +
      "here can turn the JPG back into one. Convert a copy.",
  },
  {
    slug: "heic-to-png",
    from: "heic",
    to: "png",
    fromLabel: HEIC,
    toLabel: PNG,
    tagline: "Bring an iPhone photograph into an editor at full quality.",
    why:
      "Editing is the reason to choose PNG here. A HEIC has already thrown " +
      "away detail to be small, and every JPG saved on top of it throws away " +
      "a little more. PNG records each pixel exactly and never degrades, so " +
      "a picture headed for a design tool, a report, or a mock up begins " +
      "from the best copy that remains, and survives being saved twenty " +
      "times on the way.",
    cost:
      "Size, and a great deal of it. Recording pixels rather than " +
      "approximating them means a photograph that sat in two megabytes as a " +
      "HEIC can want twenty as a PNG. That is nothing on a desktop and " +
      "genuinely painful over mobile data or as a mail attachment.",
    caution:
      "Do not choose PNG to send a picture to a person. Sharing is the one " +
      "job it is bad at, and plenty of upload boxes refuse it on size alone. " +
      "Convert to JPG for that. PNG repays its bulk only when the picture is " +
      "about to be worked on.",
  },
  {
    slug: "heic-to-webp",
    from: "heic",
    to: "webp",
    fromLabel: HEIC,
    toLabel: WEBP,
    tagline: "Put an iPhone photograph on a web page without it getting fat.",
    why:
      "Both of these squeeze a photograph hard, so this is the rare " +
      "conversion where almost nothing is traded away. What changes is who " +
      "can open the result. A browser will not display the file your phone " +
      "produced; it will display this one, on every engine released in the " +
      "last several years. If a picture is going into a page, a theme, or a " +
      "shop listing, this is the destination that keeps it light.",
    cost:
      "A second squeeze on an already squeezed picture always costs a little " +
      "fine detail, and it is worth choosing a high setting for anything " +
      "with skin or sky in it. The file will land near the size it started " +
      "at rather than far below, because there was not much slack left to " +
      "take.",
    caution:
      "Not for anybody's inbox. Mail clients and older desktop software are " +
      "the two places WebP still stumbles, and a recipient who cannot open " +
      "an attachment will not write back to say so. JPG for a person, WebP " +
      "for a page.",
  },
  {
    slug: "heic-to-avif",
    from: "heic",
    to: "avif",
    fromLabel: HEIC,
    toLabel: AVIF,
    tagline: "Trade a locked format for an open one and keep the size.",
    why:
      "These two are close relatives, built on video compression, which is " +
      "why an iPhone photograph and an AVIF of it end up around the same " +
      "weight. The difference is ownership. AVIF was made to be free of the " +
      "patent licensing that keeps HEIC an Apple format in practice, so this " +
      "is the conversion for archiving a picture in something a program " +
      "twenty years from now will still be permitted to read.",
    cost:
      "Patience. This is the slowest thing offered here, and a large " +
      "photograph will hold the page for several seconds while it is " +
      "written, so a folder of them is an errand rather than a moment. The " +
      "picture itself gives up very little.",
    caution:
      "Check where it is going first. Reach for this only when whatever " +
      "opens the file is something you chose, because support is thinner " +
      "than for anything else on this list and an older phone may show an " +
      "empty box. Anywhere else, WebP asks fewer questions.",
  },
  {
    slug: "avif-to-webp",
    from: "avif",
    to: "webp",
    fromLabel: AVIF,
    toLabel: WEBP,
    tagline: "Trade a little size for a format more things can read.",
    why:
      "WebP is read by every current browser and by much more desktop software " +
      "than AVIF, while staying far smaller than PNG or JPG. It is the middle " +
      "ground when AVIF is too new for whatever has to open the file.",
    cost:
      "The file grows, usually by something between a third and a half, and " +
      "the picture goes through a second compression.",
    caution:
      "If the file is going to a person rather than a page, PNG or JPG will " +
      "give you the least trouble.",
  },
];

export function findPair(slug: string): Pair | undefined {
  return pairs.find((pair) => pair.slug === slug);
}

/**
 * The pages worth linking from this one.
 *
 * A page links to the pairs that share a format with it, because somebody who
 * wanted PNG to JPG is far more likely to want PNG to WebP next than
 * something unrelated. Links that follow a real path are worth more than a
 * list of everything.
 */
export function relatedPairs(pair: Pair, limit = 4): Pair[] {
  return pairs
    .filter((other) => other.slug !== pair.slug)
    .filter((other) => other.from === pair.from || other.to === pair.to)
    .slice(0, limit);
}
