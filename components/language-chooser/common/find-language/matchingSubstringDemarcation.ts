import { cloneDeep } from "lodash";
import { ILanguage } from "./findLanguageInterfaces";

// for marking/bolding the substrings which match the search string
export const START_OF_MATCH_MARKER = "[";
export const END_OF_MATCH_MARKER = "]";

function indicesOf(searchString: string, stringToSearch: string): number[] {
  const indices = [] as number[];
  let index = 0;
  while (index < stringToSearch.length) {
    index = stringToSearch
      .toLowerCase()
      .indexOf(searchString.toLowerCase(), index);
    if (index === -1) {
      break;
    }
    indices.push(index);
    index += searchString.length;
  }
  return indices;
}

function isPrefix(entireString: string, startIndex: number): boolean {
  return startIndex === 0 || entireString[startIndex - 1] === " ";
}

function isWholeWord(
  entireString: string,
  startIndex: number,
  length: number
): boolean {
  return (
    isPrefix(entireString, startIndex) &&
    (startIndex + length === entireString.length ||
      entireString[startIndex + length] === " ")
  );
}

function demarcateString(
  str: string,
  startIndex: number,
  length: number
): string {
  return (
    str.slice(0, startIndex) +
    START_OF_MATCH_MARKER +
    str.slice(startIndex, startIndex + length) +
    END_OF_MATCH_MARKER +
    str.slice(startIndex + length)
  );
}

export const TEMPORARY_SEPARATOR = "###";
function demarcateResult(result: ILanguage, searchString: string): ILanguage {
  let firstPrefixMatchField: string | undefined = undefined;
  let firstPrefixMatchIndex: number | undefined = undefined;
  let firstSubstringMatchField: string | undefined = undefined;
  let firstSubstringMatchIndex: number | undefined = undefined;
  // fields should be in order of priority for highlighting as we will highlight only once and prioritize earlier fields
  for (const [fieldName, fieldValue] of [
    ["autonym", result.autonym],
    ["exonym", result.exonym],
    ["languageSubtag", result.languageSubtag],
    ["names", result.names.join(TEMPORARY_SEPARATOR)],
    ["regionNames", result.regionNames],
  ]) {
    if (!fieldValue) {
      continue;
    }
    const indices = indicesOf(searchString, fieldValue);
    for (const index of indices) {
      if (isWholeWord(fieldValue, index, searchString.length)) {
        return addDemarcation(
          result,
          fieldName as string,
          index,
          searchString.length
        );
      } else if (isPrefix(fieldValue, index)) {
        if (!firstPrefixMatchField) {
          firstPrefixMatchField = fieldName;
          firstPrefixMatchIndex = index;
        }
      } else {
        if (!firstSubstringMatchField) {
          firstSubstringMatchField = fieldName;
          firstSubstringMatchIndex = index;
        }
      }
    }
  }
  if (firstPrefixMatchField) {
    return addDemarcation(
      result,
      firstPrefixMatchField,
      firstPrefixMatchIndex as number,
      searchString.length
    );
  } else if (firstSubstringMatchField) {
    return addDemarcation(
      result,
      firstSubstringMatchField,
      firstSubstringMatchIndex!,
      searchString.length
    );
  }
  return result;
}

function addDemarcation(
  result: ILanguage,
  fieldName: string,
  startIndex: number,
  matchLength: number
) {
  const stringToDemarcate =
    fieldName === "names" ? result.names.join("###") : result[fieldName];
  const demarcatedFieldValue = demarcateString(
    stringToDemarcate,
    startIndex,
    matchLength
  );
  const newResult = cloneDeep(result);
  if (fieldName === "names") {
    newResult.names = demarcatedFieldValue.split("###");
  } else {
    newResult[fieldName] = demarcatedFieldValue;
  }
  return newResult;
}

// Mark the matching part of the string with square brackets so we can highlight it
// e.g. if the search string was "ngl" then any instance of "English" would be marked as "E[ngl]ish"
export function demarcateResults(results: ILanguage[], searchString: string) {
  const resultsCopy = cloneDeep(results);
  for (let i = 0; i < resultsCopy.length; i++) {
    resultsCopy[i] = demarcateResult(resultsCopy[i], searchString); // TODO can this just modify instead?
  }
  return resultsCopy;
}

export function stripDemarcation(
  demarcatedText: string | undefined
): string | undefined {
  if (!demarcatedText) {
    return demarcatedText;
  }
  if (!demarcatedText) return demarcatedText;
  return demarcatedText
    .replaceAll(END_OF_MATCH_MARKER, "")
    .replaceAll(START_OF_MATCH_MARKER, "");
}

export function deepStripDemarcation<T>(demarcated: T): T {
  if (!demarcated) {
    return demarcated;
  }
  if (typeof demarcated === "string") {
    return stripDemarcation(demarcated) as T;
  }
  if (Array.isArray(demarcated)) {
    return demarcated.map((element) => deepStripDemarcation(element)) as T;
  }
  if (typeof demarcated === "object") {
    const newObject: any = {};
    for (const key of Object.keys(demarcated)) {
      newObject[key] = deepStripDemarcation((demarcated as any)[key]);
    }
    return newObject;
  }
  return demarcated;
}
