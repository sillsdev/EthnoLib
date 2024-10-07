import shortestTags from "./language-data/shortestTagLookups.json" assert { type: "json" };

const shortPreferredTagLookup = new Map<string, string>();
for (const tagset of shortestTags) {
  for (const tag of tagset.allTags) {
    shortPreferredTagLookup.set(tag, tagset.shortest);
  }
}

export function getShortestSufficientLangtag(langtag: string): string {
  return shortPreferredTagLookup.get(langtag) || langtag;
}
