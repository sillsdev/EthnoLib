import { cloneDeep } from "lodash";
import { FuseResult } from "fuse.js";
import { fieldsToSearch, ILanguage } from "@ethnolib/find-language";

// for marking/bolding the substrings which match the search string
export const START_OF_MATCH_MARKER = "[";
export const END_OF_MATCH_MARKER = "]";

// Mark the matching part of the string with square brackets so we can highlight it
// e.g. if the search string was "ngl" then any instance of "English" would be marked as "E[ngl]ish"
export function demarcateResults(results: FuseResult<ILanguage>[]) {
  const resultsCopy = cloneDeep(results);
  for (const result of resultsCopy) {
    for (const match of result.matches || []) {
      let lastTransferredIndex = 0;
      const newValue = [] as string[];
      for (const [matchStart, matchEnd] of match.indices) {
        newValue.push(
          match.value?.slice(lastTransferredIndex, matchStart) || ""
        );
        newValue.push(START_OF_MATCH_MARKER);
        newValue.push(match.value?.slice(matchStart, matchEnd + 1) || "");
        newValue.push(END_OF_MATCH_MARKER);
        lastTransferredIndex = matchEnd + 1;
      }
      newValue.push(match.value?.slice(lastTransferredIndex) || "");
      const newValueString = newValue.join("");
      if (match.refIndex !== undefined) {
        // this is a match to an element in an array. Fuse uses refIndex to indicate which element in the array
        result.item[match.key || ""][match.refIndex] = newValueString;
      } else {
        result.item[match.key || ""] = newValueString;
      }
    }
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
  let strippedStr = demarcatedText.replaceAll(END_OF_MATCH_MARKER, "");
  strippedStr = strippedStr.replaceAll(START_OF_MATCH_MARKER, "");
  return strippedStr;
}

// Normally, we get the locations of hte match from fuse and use that to demarcate the part of the string that matches.
// Use this only when we don't have fuse results which give us match indexes, but when we nonetheless want to demarcate the matching
// parts of the string, and are okay with demarcating only the exact matches (no fuzzy match finding). Look for matches ourselves and mark them.
// Currently this only finds the first match in the field,
export function demarcateExactMatches(searchString: string, result: ILanguage) {
  for (const field of fieldsToSearch) {
    if (Array.isArray(result[field])) {
      result[field] = result[field].map((value) =>
        demarcateExactMatchString(searchString, value)
      );
    } else if (typeof result[field] === "string") {
      result[field] = demarcateExactMatchString(searchString, result[field]);
    }
  }
  return result;
}

function demarcateExactMatchString(
  searchString: string,
  stringToDemarcate: string
) {
  const lowerCasedSearchString = searchString.toLowerCase();
  const lowerCasedValue = stringToDemarcate.toLowerCase();
  const indexOfSearchString = lowerCasedValue.indexOf(lowerCasedSearchString);
  if (indexOfSearchString !== -1) {
    return (
      stringToDemarcate.slice(0, indexOfSearchString) +
      START_OF_MATCH_MARKER +
      stringToDemarcate.slice(
        indexOfSearchString,
        indexOfSearchString + searchString.length
      ) +
      END_OF_MATCH_MARKER +
      stringToDemarcate.slice(indexOfSearchString + searchString.length)
    );
  }
  return stringToDemarcate;
}
