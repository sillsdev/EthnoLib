/**
 * Short names for the script subtags a reader is likely to meet here, so the
 * table doesn't ask anyone to know that Mymr is Burmese. Kept inline, and
 * deliberately not read from the `iso-15924` package the language chooser uses:
 * that package is a dependency of a component that is not on every branch of
 * this repo, and this app should need nothing but its own dependencies. Anything
 * not listed shows its code alone, which is correct if unfriendly. Names are
 * shortened from ISO 15924's, which run to things like "Takri, Ṭākrī, Ṭāṅkrī".
 */
export const SCRIPT_NAMES: Record<string, string> = {
  Latn: "Latin",
  Arab: "Arabic",
  Deva: "Devanagari",
  Cyrl: "Cyrillic",
  Brai: "Braille",
  Tibt: "Tibetan",
  Ethi: "Ethiopic",
  Thai: "Thai",
  Beng: "Bengali",
  Mymr: "Myanmar",
  Hebr: "Hebrew",
  Laoo: "Lao",
  Grek: "Greek",
  Orya: "Odia",
  Hani: "Han",
  Hans: "Han, simplified",
  Hant: "Han, traditional",
  Telu: "Telugu",
  Cans: "Canadian Aboriginal syllabics",
  Tfng: "Tifinagh",
  Mlym: "Malayalam",
  Runr: "Runic",
  Taml: "Tamil",
  Gujr: "Gujarati",
  Syrc: "Syriac",
  Knda: "Kannada",
  Khmr: "Khmer",
  Mong: "Mongolian",
  Takr: "Takri",
  Yiii: "Yi",
  Plrd: "Miao",
  Ital: "Old Italic",
  Brah: "Brahmi",
  Geor: "Georgian",
  Java: "Javanese",
  Ogam: "Ogham",
  Dupl: "Duployan",
  Cyrs: "Old Church Slavonic Cyrillic",
  Kthi: "Kaithi",
  Xsux: "Cuneiform",
  Newa: "Newa",
  Bugi: "Buginese",
};
