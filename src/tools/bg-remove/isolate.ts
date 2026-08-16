/**
 * Asks the browser for cross-origin isolation on this page.
 *
 * The service worker beside this file adds the two headers that isolation
 * needs, which lets the model run on more than one core. A page only becomes
 * isolated on a load that the worker already controlled, so the first visit
 * has to reload once.
 *
 * That reload is guarded. A loop here would leave a visitor on a page that
 * refreshes forever, which is far worse than a slow conversion, so the guard
 * allows exactly one attempt for each tab.
 */

const ONCE = "bitsmith-coi-reloaded";

export type IsolationState = "isolated" | "single-core" | "reloading";

export async function requestIsolation(): Promise<IsolationState> {
  if (self.crossOriginIsolated) {
    return "isolated";
  }

  // No service worker means no isolation. The tool still works on one core.
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return "single-core";
  }

  try {
    const registration = await navigator.serviceWorker.register("coi.js", {
      scope: "./",
    });

    // Already tried once in this tab. Reloading again would be a loop.
    if (sessionStorage.getItem(ONCE)) {
      return "single-core";
    }

    if (registration.active) {
      sessionStorage.setItem(ONCE, "1");
      window.location.reload();
      return "reloading";
    }

    // The worker installed on this load but does not control the page yet.
    // It will on the next one.
    //
    // The wait is capped. `ready` never rejects, so a worker that fails to
    // activate would leave the page waiting for it and the model would never
    // start downloading. Three seconds and then carry on without isolation.
    const activated = await Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
    ]);

    if (!activated) {
      return "single-core";
    }

    sessionStorage.setItem(ONCE, "1");
    window.location.reload();
    return "reloading";
  } catch {
    return "single-core";
  }
}
