import equivalentTags from "./language-data/equivalentTags.json" assert { type: "json" };

// Keys are lower cased
const shortPreferredTagLookup = new Map<string, string>();
const maximalTagLookup = new Map<string, string>();
for (const tagset of equivalentTags) {
  for (const tag of tagset.allTags) {
    shortPreferredTagLookup.set(tag.toLowerCase(), tagset.shortest);
    maximalTagLookup.set(tag.toLowerCase(), tagset.maximal);
  }
}

// case insensitive
export function getShortestSufficientLangtag(
  langtag: string
): string | undefined {
  return shortPreferredTagLookup.get(langtag.toLowerCase());
}

// case insensitive
export function getMaximalLangtag(langtag: string): string | undefined {
  return maximalTagLookup.get(langtag.toLowerCase());
}

export function createTag({
  languageCode,
  scriptCode,
  regionCode,
  dialectCode,
}: {
  languageCode?: string;
  scriptCode?: string;
  regionCode?: string;
  dialectCode?: string;
}) {
  let tag = "";
  if (languageCode) {
    tag += languageCode;
  } else {
    // Unlisted language
    tag += "qaa";
  }
  if (scriptCode) {
    tag += `-${scriptCode}`;
  }
  if (regionCode) {
    tag += `-${regionCode}`;
  }
  // TODO future work: If we ever make the language chooser aware of registered variants, some should not be preceded by the "-x-"
  // For example, compare aai-x-suboro and be-tarask in langtags.txt and langtags.json
  if (!languageCode || dialectCode) {
    tag += "-x";
  }
  if (dialectCode) {
    tag += `-${dialectCode}`;
  }
  return getShortestSufficientLangtag(tag) || tag;
}
