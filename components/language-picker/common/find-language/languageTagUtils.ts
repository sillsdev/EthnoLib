import { getShortestSufficientLangtag } from "./getShortestSufficientLangtag";

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
  if (!languageCode) {
    tag += "-x";
  }
  if (dialectCode) {
    tag += `-${dialectCode}`;
  }
  return getShortestSufficientLangtag(tag);
}
