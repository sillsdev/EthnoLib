import shortestTags from "./shortestTagLookups.json" assert { type: "json" };

const shortPreferredTagLookup = new Map<string, string>();
for (const tagset of shortestTags) {
  for (const tag of tagset.allTags) {
    shortPreferredTagLookup.set(tag, tagset.shortest);
  }
}

export function getShortestSufficientLangtag(langtag: string): string {
  return shortPreferredTagLookup.get(langtag) || langtag;
}
// TODO don't forget about casing
