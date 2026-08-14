/**
 * How popular each open font family is, per Google Fonts — as a snapshot
 * bundled into the package.
 *
 * The Fontsource catalog is alphabetical, and for a Latin alphabet nearly
 * every family in it qualifies — so a shortlist cut from the top is a page of
 * fonts starting with A, an arbitrary sample dressed up as a suggestion.
 * Ranking the candidates needs usage data, and the one keyless place that
 * publishes it is Google Fonts' own metadata (the JSON fonts.google.com
 * loads, with a `popularity` rank per family; Fontsource mirrors Google
 * Fonts, so the names join cleanly). That endpoint sends no CORS headers, so
 * a browser can never fetch it — the ranking ships here as a generated file
 * instead, 29 KB of family names in popularity order. Popularity drifts
 * slowly enough that a snapshot a release old still ranks well; refresh it
 * with `node tools/refreshPopularFamilies.mjs`.
 */

import popularFamilies from "./popularFamilies.json";

/**
 * Popularity rank by lower-cased family name, smaller meaning more popular —
 * the shape the Fontsource suggester's `getPopularity` option takes:
 *
 *     createFontsourceSuggester({ getPopularity: bundledFontPopularity })
 */
export async function bundledFontPopularity(): Promise<
  ReadonlyMap<string, number>
> {
  return ranking();
}

let built: ReadonlyMap<string, number> | undefined;

function ranking(): ReadonlyMap<string, number> {
  if (!built) {
    built = new Map(
      (popularFamilies as string[]).map((family, rank) => [family, rank])
    );
  }
  return built;
}
