// TODO do stripDemarcation in all the usages
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
    return `qaa-x-${dialectCode}`;
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

// TODO https://issues.bloomlibrary.org/youtrack/issue/BL-13704/Rescue-qaa-books
