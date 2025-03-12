import { cloneDeep } from "lodash";
import { FuseResult } from "fuse.js";
import { ILanguage } from "./findLanguageInterfaces";

// for marking/bolding the substrings which match the search string
export const START_OF_MATCH_MARKER = "[";
export const END_OF_MATCH_MARKER = "]";

function indicesOf(searchString: string, stringToSearch: string): number[] {
  const indices = [] as number[];
  let index = 0;
  while (index < stringToSearch.length) {
    index = stringToSearch.indexOf(searchString, index);
    if (index === -1) {
      break;
    }
    indices.push(index);
    index += searchString.length;
  }
  return indices;
}

function isWholeWord(
  entireString: string,
  startIndex: number,
  length: number
): boolean {
  return (
    (startIndex === 0 || entireString[startIndex - 1] === " ") &&
    (startIndex + length === entireString.length ||
      entireString[startIndex + length] === " ")
  );
}

// Mark the matching part of the string with square brackets so we can highlight it
// e.g. if the search string was "ngl" then any instance of "English" would be marked as "E[ngl]ish"
export function demarcateResults(
  results: FuseResult<ILanguage>[],
  searchString?: string // TODO make not optional
) {
  // TODO remove just so we can run it for now
  searchString = searchString || "";

  const resultsCopy = cloneDeep(results);
  // for (const result of resultsCopy) {
  //   const firstSubstringMatchField = undefined;
  //   const firstSubstringMatchIndex = undefined;
  //   // fields should be in order of priority for highlighting as we will highlight only once and prioritize earlier fields
  //   for (const field of [
  //     "autonym",
  //     "exonym",
  //     "languageSubtag",
  //     "names",
  //     "regionNames",
  //   ]) {
  //     const indices = indicesOf(searchString, result.item[field]);
  //     for (const index of indices) {
  //       if (isWholeWord(result.item[field], index, searchString.length)) {
  //         // TODO copilot did this, check if it is correct. Also possible factor out
  //         result.item[field] =
  //           result.item[field].slice(0, index) +
  //           START_OF_MATCH_MARKER +
  //           result.item[field].slice(index, index + searchString.length) +
  //           END_OF_MATCH_MARKER +
  //           result.item[field].slice(index + searchString.length);
  //         return; // We have found the best possible match, no need to highlight anything else
  //       }
  //       // if (indices.length > 0) {
  //       // field = field[:index] + START_OF_MATCH_MARKER + field[index:index + len(searchString)] + END_OF_MATCH_MARKER + field[index + len(searchString):]
  //       // if either index===0 or the character before index is a space, and either index+len(searchString)===field.length or the character after index+len(searchString) is a space
  //       // this is a whole word match, no need to highlight anything else
  //       // see if we can take advantage of space padding here
  //       // return;
  //     }
  //   }
  //   for (const match of result.matches || []) {
  //     let lastTransferredIndex = 0;
  //     const newValue = [] as string[];
  //     for (const [matchStart, matchEnd] of match.indices) {
  //       newValue.push(
  //         match.value?.slice(lastTransferredIndex, matchStart) || ""
  //       );
  //       newValue.push(START_OF_MATCH_MARKER);
  //       newValue.push(match.value?.slice(matchStart, matchEnd + 1) || "");
  //       newValue.push(END_OF_MATCH_MARKER);
  //       lastTransferredIndex = matchEnd + 1;
  //     }
  //     newValue.push(match.value?.slice(lastTransferredIndex) || "");
  //     const newValueString = newValue.join("");
  //     if (match.refIndex !== undefined) {
  //       // this is a match to an element in an array. Fuse uses refIndex to indicate which element in the array
  //       result.item[match.key || ""][match.refIndex] = newValueString;
  //     } else {
  //       result.item[match.key || ""] = newValueString;
  //     }
  //   }
  // }
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
