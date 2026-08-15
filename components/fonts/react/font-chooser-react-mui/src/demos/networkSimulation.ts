/**
 * Makes the harness's connection setting bite.
 *
 * The setting on its own only told the chooser what to believe; every request
 * the page made still went out and still succeeded, so "offline" exercised the
 * branches that decide *not* to fetch and nothing else. The interesting bugs are
 * on the other side of that line — what the screen does with a request that
 * fails, a font file that never arrives, a provider whose cache is all it has —
 * and they need requests that really fail.
 *
 * A page cannot put the browser offline: that switch lives in DevTools and
 * behind CDP's `Network.emulateNetworkConditions`. So the interference is done
 * here, in two layers, because neither reaches everything:
 *
 * - **The patched `fetch`** covers everything the chooser and the suggestion
 *   providers ask for themselves, which is most of it, and works on the first
 *   load before any service worker is running.
 * - **The service worker** (`public/networkSimulationServiceWorker.js`) covers
 *   what JavaScript never sees: the font files the browser fetches for a
 *   `FontFace`, stylesheets, images. Those are the name previews and the sample
 *   text, so leaving them out would have left the most visible part of the page
 *   working while offline.
 *
 * Only one of the two acts at a time — whichever is nearer the network wins, so
 * a metered request is held once rather than twice — and each reports what it
 * did, so the harness can say when it has interfered rather than leaving a
 * developer to wonder whether they are looking at a bug or at the simulation.
 *
 * Same-origin requests are always left alone. Blocking those would take the dev
 * server's own modules down with the simulation, and the page would be gone
 * before it could show what offline looks like.
 *
 * None of this is part of the published component: a host app's connection is
 * its own business, and this file lives with the demo.
 */
import type { NetworkAvailability } from "../types";

/**
 * How long a metered request is held before it is let through.
 *
 * Long enough to see the chooser's loading states do their job, short enough to
 * stay inside the request timeouts the providers set — the point is a slow
 * connection, not a broken one.
 */
export const METERED_DELAY_MS = 1200;

/** What the service worker and the page say to each other. */
const STATE_MESSAGE = "ethnolib-network-state";
const INTERFERENCE_MESSAGE = "ethnolib-network-interference";

/** One request the simulation got in the way of. */
export interface InterferenceEvent {
  kind: "blocked" | "delayed";
  url: string;
  /** Which layer caught it; see the note above on why there are two. */
  via: "fetch" | "service worker";
  /** How long a delayed request was held. */
  ms?: number;
}

let simulated: NetworkAvailability = "open";
let installed = false;
const listeners = new Set<(event: InterferenceEvent) => void>();

/** Called for every request the simulation blocked or delayed. */
export function onInterference(
  listener: (event: InterferenceEvent) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function report(event: InterferenceEvent) {
  listeners.forEach((listener) => listener(event));
}

/**
 * Puts the simulation into a state, and tells the browser about it: code that
 * reads `navigator.onLine` or waits for an `offline` event — the chooser's own
 * `useNetworkAvailability` among it — should see what it would see if the
 * machine had really dropped off the network.
 */
export function setSimulatedNetwork(state: NetworkAvailability): void {
  if (state === simulated) return;
  const wasOffline = simulated === "offline";
  simulated = state;
  navigator.serviceWorker?.controller?.postMessage({
    type: STATE_MESSAGE,
    state,
  });
  if (wasOffline !== (state === "offline"))
    window.dispatchEvent(new Event(state === "offline" ? "offline" : "online"));
}

/**
 * Starts the simulation: shadows `navigator.onLine`, wraps `fetch`, and
 * registers the service worker. Idempotent, and safe to call before the first
 * state is set — an "open" simulation does nothing at all.
 */
export function installNetworkSimulation(): void {
  if (installed) return;
  installed = true;

  // `onLine` is a getter on Navigator.prototype, so an own property on the
  // instance shadows it for every reader on the page.
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => simulated !== "offline",
  });

  patchFetch();
  registerServiceWorker();
}

function patchFetch() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    // The service worker sits closer to the network and catches strictly more,
    // so where it is in charge this layer stands aside; otherwise the same
    // request would be held twice on a metered connection.
    if (simulated === "open" || sameOrigin(url) || serviceWorkerInCharge())
      return realFetch(input, init);

    if (simulated === "offline") {
      report({ kind: "blocked", url, via: "fetch" });
      // The message Chrome itself gives, so nothing downstream can tell the
      // difference between this and a real dead connection.
      throw new TypeError("Failed to fetch");
    }

    report({ kind: "delayed", url, via: "fetch", ms: METERED_DELAY_MS });
    // The signal is honoured while waiting: a request the chooser gave up on
    // must not come back to life just because the simulation was holding it.
    await hold(METERED_DELAY_MS, signalOf(input, init));
    return realFetch(input, init);
  };
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.type !== INTERFERENCE_MESSAGE) return;
    report({ kind: data.kind, url: data.url, via: "service worker", ms: data.ms });
  });

  // Relative, so the demo works both from the dev server's root and from the
  // built site, which is deployed with a relative base.
  navigator.serviceWorker
    .register("./networkSimulationServiceWorker.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      // A worker that has just claimed this page, or that was restarted after
      // idling, starts out believing the connection is open.
      navigator.serviceWorker.controller?.postMessage({
        type: STATE_MESSAGE,
        state: simulated,
      });
    })
    .catch(() => {
      // No worker — an unsupported browser, or the file served from somewhere
      // it can't take scope over. The patched fetch stays in charge, which is
      // most of the traffic; nothing here is worth an error page over.
    });
}

function serviceWorkerInCharge(): boolean {
  return !!navigator.serviceWorker?.controller;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function sameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

function signalOf(
  input: RequestInfo | URL,
  init?: RequestInit
): AbortSignal | undefined {
  if (init?.signal) return init.signal;
  return typeof input === "object" && "signal" in input
    ? (input as Request).signal
    : undefined;
}

function hold(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = () =>
      reject(new DOMException("The operation was aborted.", "AbortError"));
    if (signal?.aborted) return aborted();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        aborted();
      },
      { once: true }
    );
  });
}
