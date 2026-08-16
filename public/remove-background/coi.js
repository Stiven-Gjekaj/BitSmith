/**
 * Turns on cross-origin isolation for the background remover page.
 *
 * Multi-threaded WebAssembly needs SharedArrayBuffer, and a browser only
 * offers that to a page that is cross-origin isolated. A page becomes isolated
 * by being served with two response headers, and GitHub Pages sends no custom
 * header at all. Section 6 of docs/plan.md records that limit.
 *
 * A service worker gets around it. It sits between the page and the network
 * and can add headers to a response that the host never sent. The measured
 * effect is large: the model runs on one core without this, and the machine
 * usually has several.
 *
 * The scope is the point. This file sits in the background remover's own
 * directory, so it controls that page and nothing else. Isolation breaks
 * third-party embedding, and the rest of the site keeps its ordinary
 * behaviour. That is the per-route isolation the plan wanted and could not get
 * from the host.
 */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // A request the browser makes to check its own cache must be left alone.
  // Answering it with a network response breaks navigation in Safari.
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // An opaque response has no readable body and no headers to copy.
        if (response.status === 0) {
          return response;
        }

        const headers = new Headers(response.headers);
        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        headers.set("Cross-Origin-Resource-Policy", "same-origin");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
      // A failure here must not blank the page. Let the request through.
      .catch(() => fetch(request)),
  );
});
