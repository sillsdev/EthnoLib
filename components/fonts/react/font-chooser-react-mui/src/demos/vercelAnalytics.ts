// Vercel Web Analytics for the deployed demo site.
//
// Vercel's own instructions say to `npm i @vercel/analytics` and render its
// <Analytics/> component, but that package's peer range is react ^18 || ^19 and
// this workspace is pinned to react 17, so npm refuses to install it. The
// package does exactly one thing at runtime: add this script tag. So we add it
// ourselves and skip the dependency. Revisit if we ever move to react 18+.
//
// Vercel serves /_vercel/insights/script.js from the deployment itself; it does
// not exist on a local dev server, hence the production check (which Vite
// compiles away, so nothing ships to dev).
export function injectVercelAnalytics() {
  if (!import.meta.env.PROD) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
}
