/**
 * Nonsense text built from the user's own alphabet, for showing what a font looks
 * like in their language rather than in Latin lorem ipsum. Nothing here means
 * anything; the point is a page of text whose letters, and letter frequencies,
 * are the ones they will actually be setting.
 */

/**
 * Vowel letters, by their base form. Latin's own five, plus the vowels IPA-based
 * orthographies most often add. A letter not on this list is taken for a
 * consonant, which is the right guess for the great majority of them.
 */
const VOWEL_BASES = new Set([..."aeiouyəɛɔæøœɤʌɑɒɪʊɨʉɯ"]);

/** What the user's alphabet is made of: one entry per letter of it. */
export function alphabetUnits(alphabet: string): string[] {
  // Someone who writes "a b ng o" is telling us that "ng" is one letter, and the
  // pseudo-text has to treat it as one. Only a written-out separator says that,
  // so an alphabet typed without separators is read letter by letter.
  const separated = alphabet.split(/[\s,;|/]+/).filter(Boolean);
  if (separated.length > 1) return separated;
  return letters(alphabet);
}

/** Code points, with any combining marks kept on the letter they belong to. */
function letters(text: string): string[] {
  const found: string[] = [];
  for (const character of text) {
    if (/[\s,;|/]/.test(character)) continue;
    if (found.length > 0 && /\p{M}/u.test(character)) {
      found[found.length - 1] += character;
    } else {
      found.push(character);
    }
  }
  return found;
}

/**
 * Whether a letter of the alphabet is a vowel, judged by its base form: an "ɔ̀"
 * is an "ɔ" with a tone mark on it, and a digraph is judged by the letter it
 * starts with, which makes "ng" a consonant and "ai" a vowel.
 */
function isVowel(unit: string): boolean {
  const base = [...unit.normalize("NFD")].find(
    (character) => !/\p{M}/u.test(character)
  );
  return base !== undefined && VOWEL_BASES.has(base.toLowerCase());
}

/**
 * A 32-bit hash of the alphabet, to seed the generator with. The same alphabet
 * has to produce the same text every time: text that reshuffled itself on every
 * render would be unreadable, and text that changed between visits would make
 * two fonts impossible to compare.
 */
function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, and good enough for choosing letters. */
function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Syllable shapes, listed as often as they should turn up. Consonant-vowel is
// what most of the world's syllables look like, so most of these are that.
const SYLLABLES = ["CV", "CV", "CV", "CV", "CV", "CV", "CVC", "CVC", "V"];
// Likewise word lengths: mostly one or two syllables, occasionally four.
const SYLLABLES_PER_WORD = [1, 1, 1, 2, 2, 2, 2, 3, 3, 4];
const WORDS_PER_SENTENCE = [5, 6, 6, 7, 7, 8, 9];

/**
 * A word with its first letter capitalised, so that sentences start the way the
 * user's real text will. The capital need not be a letter of their alphabet —
 * looking like writing is the point — but a script with no capitals is left
 * alone, which is what both of these tests catch: a caseless letter uppercases to
 * itself, and the few that uppercase to two letters (ß to SS) would leave a word
 * one letter longer than the alphabet can account for.
 */
function capitalized(word: string): string {
  const first = [...word][0];
  if (first === undefined) return word;
  const upper = first.toUpperCase();
  if (upper === first || [...upper].length !== 1) return word;
  return upper + word.slice(first.length);
}

export interface ExampleTextOptions {
  /** Roughly how many words to write. The last sentence is finished off. */
  words?: number;
}

/**
 * A few sentences of pseudo-text in the user's alphabet, the same every time for
 * the same alphabet.
 *
 * An alphabet with no vowels in it (or none this recognises) still gets text: the
 * letters it does have are strung together instead, which is not a syllable but is
 * still their letters at their frequencies, and beats an empty box.
 */
export function generateExampleText(
  alphabet: string,
  options: ExampleTextOptions = {}
): string {
  const units = alphabetUnits(alphabet);
  if (units.length === 0) return "";

  const vowels = units.filter(isVowel);
  const consonants = units.filter((unit) => !isVowel(unit));
  const random = randomFrom(seedFrom(alphabet));
  const pick = <T>(from: T[]): T => from[Math.floor(random() * from.length)];

  // With only one kind of letter to hand there are no syllables to build, so the
  // shapes collapse to runs of whatever there is.
  const shapes =
    vowels.length === 0 || consonants.length === 0
      ? ["X", "X", "XX"]
      : SYLLABLES;
  const only = vowels.length === 0 ? consonants : vowels;

  const letterFor = (kind: string) => {
    if (kind === "C") return pick(consonants);
    if (kind === "V") return pick(vowels);
    return pick(only);
  };
  const word = () => {
    let built = "";
    for (let i = 0; i < pick(SYLLABLES_PER_WORD); i++) {
      for (const kind of pick(shapes)) built += letterFor(kind);
    }
    return built;
  };

  const wanted = options.words ?? 24;
  const sentences: string[] = [];
  for (let written = 0; written < wanted; ) {
    const left = wanted - written;
    // A last sentence of one or two words reads as a mistake rather than as
    // prose, so the tail goes on the end of this one instead.
    const chosen = pick(WORDS_PER_SENTENCE);
    const length = left - chosen < 4 ? left : chosen;
    const words: string[] = [];
    for (let i = 0; i < length; i++) words.push(word());
    words[0] = capitalized(words[0]);
    sentences.push(`${words.join(" ")}.`);
    written += length;
  }
  return sentences.join(" ");
}
