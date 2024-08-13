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
  if (!languageCode) {
    // Unlisted language
    let tag = "qaa";
    if (regionCode) {
      tag += `-${regionCode}`;
    }
    tag += `-x-${dialectCode}`;
    return tag;
  }
  let tag = languageCode;
  if (scriptCode) {
    tag += `-${scriptCode}`;
  }
  if (regionCode) {
    tag += `-${regionCode}`;
  }
  if (dialectCode) {
    tag += `-${dialectCode}`;
  }
  return tag;
}
