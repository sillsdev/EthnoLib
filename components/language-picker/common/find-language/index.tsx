import Fuse, { FuseResult } from "fuse.js";
import languages from "./languageData.json";
import { ILanguage } from "./dataHolderTypes";
import { useAutocomplete } from "@mui/material";

const fuseSearchKeys = [
  { name: "autonym", weight: 100 },
  { name: "exonym", weight: 100 },
  { name: "code", weight: 80 },
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
    distance: 10, // we want match score to fall off very slowly, really use distance from the beginning only as a tie breaker
    // useExtendedSearch: false,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
    keys: fuseSearchKeys,
    ignoreFieldNorm: true,
    useExtendedSearch: true,

  };
  const fuse = new Fuse(languages as ILanguage[], fuseOptions);

  return fuse.search(queryString);
}

export { ILanguage, IScript, IRegion } from "./dataHolderTypes";
