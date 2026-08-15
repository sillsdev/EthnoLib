/* global self, caches, fetch, Response, URL, setTimeout */
/*
 * The demo harness's simulated connection, enforced where JavaScript can't see.
 *
 * A patched `window.fetch` covers what the page asks for itself, but the font
 * files behind a `FontFace`, the stylesheets and the images are fetched by the
 * browser's own loader — and those are the name previews and the samples, the
 * most visible part of the screen. A service worker sees all of it.
 *
 * See src/demos/networkSimulation.ts, which registers this, tells it which state
 * to be in, and collects what it reports. Plain JS in public/ because it is
 * served as-is: a service worker is fetched by the browser at its own URL, not
 * imported by the bundle.
 */

/** Kept in step with METERED_DELAY_MS in networkSimulation.ts. */
const METERED_DELAY_MS = 1200;

const STATE_MESSAGE = "ethnolib-network-state";
const INTERFERENCE_MESSAGE = "ethnolib-network-interference";

/*
 * The state has to outlive this script. A worker is stopped whenever it has been
 * idle for a while and started again for the next request, and a variable would
 * come back as "open" — the simulation would quietly switch itself off partway
 * through a session, which is precisely the sort of thing a developer would
 * report as a bug in the chooser. So it is written to a cache, and the variable
 * is only the copy in hand.
 */
const STATE_CACHE = "ethnolib-network-simulation";
const STATE_KEY = "/__simulated-network";
let state;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  // Takes charge of the page that registered it without waiting for a reload;
  // otherwise the first visit of a session is the one visit the worker misses.
  event.waitUntil(self.clients.claim())
);

self.addEventListener("message", (event) => {
  if (event.data?.type !== STATE_MESSAGE) return;
  state = event.data.state;
  event.waitUntil(
    caches
      .open(STATE_CACHE)
      .then((cache) => cache.put(STATE_KEY, new Response(state)))
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // The dev server's own modules, and the built site's assets. Cutting those off
  // would take the page down with the simulation.
  if (url.origin === self.location.origin) return;
  // Answered from here even when the connection is open, because whether it is
  // open can only be read asynchronously and this decision cannot wait; an open
  // connection just passes the request straight through.
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const now = await currentState();
  if (now === "offline") {
    report("blocked", request.url);
    // What the browser returns for a request that never reached anything, so
    // the page's `fetch` rejects exactly as it would with the cable pulled.
    return Response.error();
  }
  if (now === "metered") {
    report("delayed", request.url, METERED_DELAY_MS);
    await new Promise((resolve) => setTimeout(resolve, METERED_DELAY_MS));
  }
  return fetch(request);
}

async function currentState() {
  if (state) return state;
  const cache = await caches.open(STATE_CACHE);
  const stored = await cache.match(STATE_KEY);
  state = stored ? await stored.text() : "open";
  return state;
}

async function report(kind, url, ms) {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients)
    client.postMessage({ type: INTERFERENCE_MESSAGE, kind, url, ms });
}
