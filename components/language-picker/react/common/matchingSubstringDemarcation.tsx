import { cloneDeep } from "lodash";
import { FuseResult } from "fuse.js";
import { ILanguage } from "@ethnolib/find-language";

// for marking/bolding the substrings which match the search string
export const START_OF_MATCH_MARKER = "[";
export const END_OF_MATCH_MARKER = "]";

export function demarcateResults(results: FuseResult<ILanguage>[]) {
  const resultsCopy = cloneDeep(results);
  for (const result of resultsCopy) {
    for (const match of result.matches) {
      let lastTrasnferredIndex = 0;
      const newValue = [] as string[];
      for (const [matchStart, matchEnd] of match.indices) {
        newValue.push(match.value.slice(lastTrasnferredIndex, matchStart));
        newValue.push(START_OF_MATCH_MARKER);
        newValue.push(match.value.slice(matchStart, matchEnd + 1));
        newValue.push(END_OF_MATCH_MARKER);
        lastTrasnferredIndex = matchEnd + 1;
      }
      newValue.push(match.value.slice(lastTrasnferredIndex));
      if (match.refIndex !== undefined) {
        // this is a match to an element in an array
        result.item[match.key][match.refIndex] = newValue.join("");
      } else {
        result.item[match.key] = newValue.join("");
      }
    }
  }
  return resultsCopy;
}

// TODO some version has built in replaceAll 
export function stripDemarcation(str: string): string {
  if (!str) return str;
  let strippedStr = replaceAll(str, END_OF_MATCH_MARKER, "");
  strippedStr = replaceAll(strippedStr, START_OF_MATCH_MARKER, "");
  return strippedStr;
}

function replaceAll(str: string, search: string, replacement: string): string {
    return str.split(search).join(replacement);
}