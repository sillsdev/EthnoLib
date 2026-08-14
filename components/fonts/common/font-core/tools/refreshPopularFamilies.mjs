// Regenerates src/suggestions/popularFamilies.json from Google Fonts' own
// metadata (the JSON fonts.google.com loads, with a `popularity` rank per
// family). That endpoint sends no CORS headers, so a browser can never read
// it — which is why the ranking ships as a snapshot instead of being fetched
// at runtime. Run this from time to time to keep the snapshot current:
//
//   node tools/refreshPopularFamilies.mjs
//
// Popularity drifts slowly, so "from time to time" is a release cadence, not
// a build step.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const METADATA_URL = "https://fonts.google.com/metadata/fonts";
const out = fileURLToPath(
  new URL("../src/suggestions/popularFamilies.json", import.meta.url)
);

const response = await fetch(METADATA_URL);
if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText}`);
}
const body = await response.text();
// The body opens with Google's ")]}'"  anti-JSON-hijacking prefix on its own line.
const json = body.startsWith(")]}'") ? body.slice(body.indexOf("\n") + 1) : body;
const { familyMetadataList } = JSON.parse(json);

const families = familyMetadataList
  .filter(
    (entry) =>
      typeof entry.family === "string" && typeof entry.popularity === "number"
  )
  .sort((a, b) => a.popularity - b.popularity)
  .map((entry) => entry.family.toLowerCase());

if (families.length < 1000) {
  throw new Error(
    `Only ${families.length} ranked families — the endpoint's shape has probably changed; not overwriting.`
  );
}

await writeFile(out, JSON.stringify(families, null, 0) + "\n");
console.log(`Wrote ${families.length} families to ${out}`);
console.log(`Top ten: ${families.slice(0, 10).join(", ")}`);
