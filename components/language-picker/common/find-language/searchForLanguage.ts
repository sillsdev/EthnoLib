import Fuse, { FuseResult } from "fuse.js";
import languages from "./language-data/languageData.json";
import { ILanguage } from "./findLanguageInterfaces";

const fuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "languageSubtag", weight: 80 },
  { name: "names", weight: 8 },
  { name: "regionNames", weight: 1 },
];

export const fieldsToSearch = fuseSearchKeys.map((key) => key.name);

export function searchForLanguage(
  queryString: string
): FuseResult<ILanguage>[] {
  const fuseOptions = {
    isCaseSensitive: false,
    includeMatches: true,
    minMatchCharLength: 2,
    threshold: 0.2,

    // to make matches that start with the query string appear first
    location: 0,
    distance: 10,
    keys: fuseSearchKeys,
    ignoreFieldNorm: true,
  };
  const fuse = new Fuse(languages as ILanguage[], fuseOptions);

  return fuse.search("eng");
}
