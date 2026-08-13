/**
 * Reads an LDML UnicodeSet — how CLDR and the SLDR write a language's exemplar
 * characters — into the space-separated alphabet string the rest of this package
 * takes from the user (see `parseAlphabet` in alphabet.ts).
 *
 * The point is to be able to fill the alphabet field in from a language's own data
 * rather than making somebody type it. So this is deliberately a partial reader: the
 * set operations of the full syntax (`&`, `-` between sets, `\p{…}` properties)
 * don't appear in exemplar data, and anything else we don't recognise is dropped
 * rather than turned into an error. What we do handle is everything a real exemplar
 * list contains — brace clusters, escapes, and small ranges.
 *
 * Invisible characters are kept. A zero-width space or a joiner in an exemplar list
 * is there because writing the language needs it, and a font that hasn't got it
 * can't write the language; tidying such an entry away would quietly hide that.
 */

// Only the ASCII whitespace a UnicodeSet uses between items. Not \s, which would
// take out characters that are themselves exemplars (a no-break space) as well as
// nothing at all (\s does not match U+200B, and we depend on that).
const SEPARATORS = " \t\r\n";

/** How big a range we will write out; see `parseUnicodeSetToAlphabet`. */
const LARGEST_RANGE = 64;

/** One piece of a token: a literal item, or the `-` that makes a range. */
type Piece = { text: string } | { dash: true };

/**
 * The characters an exemplar set names, space-separated in the order they were
 * given. Multi-character items keep their pieces together (`{kh}` becomes one entry,
 * `kh`), since that is what the alphabet's own writers considered one letter.
 *
 * A range is written out when it is small — `a-z`, a script's consonant block — and
 * dropped when it is not. A set that names thousands of Han characters is telling us
 * about a script rather than an alphabet, and pasting all of them into the field
 * would be no use to anybody reading it.
 */
export function parseUnicodeSetToAlphabet(set: string): string {
  const entries: string[] = [];
  const seen = new Set<string>();
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

/** The inside of the set, if it is wrapped the way sets usually are. */
function stripBrackets(set: string): string {
  const trimmed = set.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed;
}

/** Split into whitespace-separated tokens, keeping `{…}` groups whole. */
function tokenize(text: string): Piece[][] {
  const tokens: Piece[][] = [];
  let current: Piece[] = [];
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
      // Set punctuation we have no use for. An intended literal bracket is escaped.
      at++;
    } else {
      current.push({ text: character });
      at++;
    }
  }
  finish();
  return tokens;
}

/**
 * The one item a `{…}` group is, with the braces gone and any escapes inside it
 * decoded. An unclosed group runs to the end rather than being thrown away.
 */
function readGroup(
  characters: string[],
  from: number
): { text: string; at: number } {
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

/**
 * What the backslash at `from - 1` stands for: `\uXXXX`, `\UXXXXXXXX`, `\u{XXXXX}`,
 * or — for `\-`, `\[`, `\\` and the rest — the character itself. A `\u` with no
 * usable hex after it is taken as a literal "u", which is the reading least likely
 * to lose a character somebody meant.
 */
function readEscape(
  characters: string[],
  from: number
): { text: string; at: number } {
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

/** The character some hex digits name, or undefined if they don't name one. */
function fromHex(hex: string): string | undefined {
  // Up to eight digits, since `\U` pads to that width: `\U0001F600`.
  if (!/^[0-9a-f]{1,8}$/i.test(hex)) return undefined;
  const codePoint = parseInt(hex, 16);
  if (codePoint > 0x10ffff) return undefined;
  return String.fromCodePoint(codePoint);
}

/**
 * A token's entries, with `a-z` runs written out. Both ends have to be a single code
 * point for a dash to mean a range; anywhere else a dash is just a character the
 * alphabet contains (hyphen is a real exemplar in plenty of languages).
 */
function resolveRanges(token: Piece[]): string[] {
  const entries: string[] = [];
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

function isOneCodePoint(text: string): boolean {
  return [...text].length === 1;
}

/** Every character from one to the other, or nothing at all if that is too many. */
function expandRange(first: string, last: string): string[] {
  const from = first.codePointAt(0);
  const to = last.codePointAt(0);
  if (from === undefined || to === undefined || to < from) return [];
  if (to - from + 1 > LARGEST_RANGE) return [];
  const expanded: string[] = [];
  for (let codePoint = from; codePoint <= to; codePoint++) {
    expanded.push(String.fromCodePoint(codePoint));
  }
  return expanded;
}
