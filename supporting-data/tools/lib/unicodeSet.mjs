// Ported verbatim from
// components/fonts/common/font-core/src/suggestions/unicodeSet.ts, types
// removed — the same way refreshAlphabetsSnapshot.mjs carries a copy of that
// package's EXEMPLARS regex. The importers must read SLDR exemplar strings
// exactly as the font chooser reads them at runtime, or the alphabet claims we
// file would disagree with what the chooser shows for the same language.
//
// Keep in step with the TypeScript original; it is the one that has tests.

const SEPARATORS = " \t\r\n";

/** How big a range we will write out; see `parseUnicodeSetToAlphabet`. */
const LARGEST_RANGE = 64;

/**
 * The characters an exemplar set names, space-separated in the order they were
 * given — the shape `parseAlphabet` reads and the shape the `characters` column
 * holds. Multi-character items keep their pieces together (`{kh}` becomes one
 * entry, `kh`).
 */
export function parseUnicodeSetToAlphabet(set) {
  const entries = [];
  const seen = new Set();
  for (const token of tokenize(stripBrackets(set))) {
    for (const entry of resolveRanges(token)) {
      if (entry.length > 0 && !seen.has(entry)) {
        seen.add(entry);
        entries.push(entry);
      }
    }
  }
  return entries.join(" ");
}

function stripBrackets(set) {
  const trimmed = set.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed;
}

/** Split into whitespace-separated tokens, keeping `{…}` groups whole. */
function tokenize(text) {
  const tokens = [];
  let current = [];
  const finish = () => {
    if (current.length > 0) tokens.push(current);
    current = [];
  };

  const characters = [...text];
  let at = 0;
  while (at < characters.length) {
    const character = characters[at];
    if (SEPARATORS.includes(character)) {
      finish();
      at++;
    } else if (character === "\\") {
      const escaped = readEscape(characters, at + 1);
      current.push({ text: escaped.text });
      at = escaped.at;
    } else if (character === "{") {
      const group = readGroup(characters, at + 1);
      current.push({ text: group.text });
      at = group.at;
    } else if (character === "-") {
      current.push({ dash: true });
      at++;
    } else if (character === "[" || character === "]") {
      at++;
    } else {
      current.push({ text: character });
      at++;
    }
  }
  finish();
  return tokens;
}

function readGroup(characters, from) {
  let text = "";
  let at = from;
  while (at < characters.length && characters[at] !== "}") {
    if (characters[at] === "\\") {
      const escaped = readEscape(characters, at + 1);
      text += escaped.text;
      at = escaped.at;
    } else {
      text += characters[at];
      at++;
    }
  }
  return { text, at: at < characters.length ? at + 1 : at };
}

function readEscape(characters, from) {
  const marker = characters[from];
  if (marker === undefined) return { text: "", at: from };

  if (marker === "u" && characters[from + 1] === "{") {
    let hex = "";
    let at = from + 2;
    while (at < characters.length && characters[at] !== "}") {
      hex += characters[at];
      at++;
    }
    const decoded = fromHex(hex);
    if (decoded !== undefined) {
      return { text: decoded, at: at < characters.length ? at + 1 : at };
    }
  } else if (marker === "u" || marker === "U") {
    const width = marker === "u" ? 4 : 8;
    const hex = characters.slice(from + 1, from + 1 + width).join("");
    const decoded = hex.length === width ? fromHex(hex) : undefined;
    if (decoded !== undefined) {
      return { text: decoded, at: from + 1 + width };
    }
  }
  return { text: marker, at: from + 1 };
}

function fromHex(hex) {
  if (!/^[0-9a-f]{1,8}$/i.test(hex)) return undefined;
  const codePoint = parseInt(hex, 16);
  if (codePoint > 0x10ffff) return undefined;
  return String.fromCodePoint(codePoint);
}

function resolveRanges(token) {
  const entries = [];
  let at = 0;
  while (at < token.length) {
    const piece = token[at];
    const next = token[at + 1];
    const after = token[at + 2];
    if (
      "text" in piece &&
      next !== undefined &&
      "dash" in next &&
      after !== undefined &&
      "text" in after &&
      isOneCodePoint(piece.text) &&
      isOneCodePoint(after.text)
    ) {
      entries.push(...expandRange(piece.text, after.text));
      at += 3;
    } else if ("text" in piece) {
      entries.push(piece.text);
      at++;
    } else {
      entries.push("-");
      at++;
    }
  }
  return entries;
}

function isOneCodePoint(text) {
  return [...text].length === 1;
}

function expandRange(first, last) {
  const from = first.codePointAt(0);
  const to = last.codePointAt(0);
  if (from === undefined || to === undefined || to < from) return [];
  if (to - from + 1 > LARGEST_RANGE) return [];
  const expanded = [];
  for (let codePoint = from; codePoint <= to; codePoint++) {
    expanded.push(String.fromCodePoint(codePoint));
  }
  return expanded;
}
