// The eighteen writing systems where a BloomLibrary book scan can be checked
// against an alphabet we already hold, and what each comparison came out as.
//
// Generated from a run of `importBloomBooks.mjs --compare-sldr`, not baked from
// the database: these are the numbers one experiment produced on one day, and
// nothing here was ever filed as a claim. `reading` is written by hand; every
// other field is the run's own output. See docs/sldr-comparison.md.

/** Whether the books reached everything the SLDR lists, part of it, or crossed it. */
export type Shape = "covers" | "subset" | "partial";

export type ComparedSystem = {
  /** The langtags writing system the claims were filed under. */
  tag: string;
  name: string;
  /** Which SLDR exemplar set this is compared against. */
  sldrTag: string;
  /** How many SLDR sets exist for this writing system, named variants included. */
  variantCount: number;
  books: number;
  /** Occurrences a letter needed to be kept, from `frequencyFloor`. */
  floor: number;
  shape: Shape;
  /** Space-separated entries. Both sides are folded the same way before comparing. */
  sldr: string;
  /** Named with a trailing underscore because `books` is already the count. */
  books_: string;
  onlySldr: string;
  onlyBooks: string;
  /** The reading of this comparison, as sentences. Contains inline markup. */
  reading: string;
};

export const COMPARED: ComparedSystem[] = [
  {
    tag: "tpi-Latn",
    name: "Tok Pisin",
    sldrTag: "tpi",
    variantCount: 1,
    books: 12,
    floor: 2,
    shape: "covers",
    sldr: "a b d e f g h i j k l m n o p r s t u w y",
    books_: "a b c d e f g h i j k l m n o p r s t u v w x y z é",
    onlySldr: "",
    onlyBooks: "c v x z é",
    reading: "The books produce every letter the SLDR lists, and five more. All five, `c v x z é`, arrive in loan words and names, which a children's library is full of. That is evidence that published Tok Pisin contains English, not a discovery about Tok Pisin's alphabet.",
  },
  {
    tag: "ceb-Latn",
    name: "Cebuano",
    sldrTag: "ceb",
    variantCount: 1,
    books: 12,
    floor: 2,
    shape: "covers",
    sldr: "a b d e g h i k l m n o p r s t u w y",
    books_: "a b c d e f g h i k l m n o p r s t u v w x y",
    onlySldr: "",
    onlyBooks: "c f v x",
    reading: "The same shape. `c f v x` are Spanish and English spellings inside Cebuano text; Cebuano's own orthography does not claim them.",
  },
  {
    tag: "ny-Latn",
    name: "Chichewa",
    sldrTag: "ny",
    variantCount: 1,
    books: 12,
    floor: 3,
    shape: "covers",
    sldr: "a b c d e f g h i j k l m n o p r s t u w y z ŵ",
    books_: "a b c d e f g h i j k l m n o p r s t u v w y z ŵ ʼ",
    onlySldr: "",
    onlyBooks: "v ʼ",
    reading: "Covers the SLDR and adds two. `v` is loan words. `ʼ` is more interesting: Chichewa writes `nʼg`, so the apostrophe is arguably a letter the SLDR set leaves out, and it occurred 119 times.",
  },
  {
    tag: "ar-Arab",
    name: "Arabic",
    sldrTag: "ar",
    variantCount: 1,
    books: 5,
    floor: 2,
    shape: "subset",
    sldr: "ء آ أ ؤ إ ئ ا ب ة ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ى ي ً ٌ ٍ َ ُ ِ ّ ْ ٰ",
    books_: "ء آ أ ؤ إ ئ ا ب ة ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ى ي ً ٌ ٍ َ ُ ِ ّ ْ",
    onlySldr: "ٰ",
    onlyBooks: "",
    reading: "The closest agreement here. Five books produce 44 of the SLDR's 45 entries and add nothing. The one missing is the superscript alef, a vowel sign belonging to Quranic orthography rather than to running Arabic.",
  },
  {
    tag: "snk-Latn",
    name: "Soninke",
    sldrTag: "snk",
    variantCount: 1,
    books: 12,
    floor: 3,
    shape: "partial",
    sldr: "a b c d e f g h i j k l m n ny o p q r s t u w x y ŋ",
    books_: "a b c d e f g h i j k l m n o p q r s t u v w x y z é ŋ ɲ",
    onlySldr: "ny",
    onlyBooks: "v z é ɲ",
    reading: "The single letter missing is the SLDR's digraph `ny`, and the books write that sound as `ɲ` instead, 104 times. Two ways of writing one sound rather than a disagreement about the alphabet. `v z é` are loans.",
  },
  {
    tag: "cak-Latn",
    name: "Kaqchikel",
    sldrTag: "cak",
    variantCount: 9,
    books: 11,
    floor: 2,
    shape: "partial",
    sldr: "a b c d e f g h i j k l m n o p q r s t u v x y z á é í ñ ó ú",
    books_: "a b c d e f g h i j k l m n o p q r s t u v w x y z á ä ë í ï ó ö ú ü ʼ",
    onlySldr: "é ñ",
    onlyBooks: "w ä ë ï ö ü ʼ",
    reading: "The SLDR's plain Kaqchikel set lists `é ñ` for Spanish words and these books do not use them. The seven the books add split in two: `ä ë ï ö ü` are real Kaqchikel vowels that the plain set omits and its town-named variants do list, and `w` and `ʼ` fall out because the plain set writes glottalised consonants as digraphs. Of the nine SLDR sets for Kaqchikel, the books match `cak-x-xenacoj` best at 31 of 33.",
  },
  {
    tag: "ixl-Latn",
    name: "Ixil",
    sldrTag: "ixl",
    variantCount: 3,
    books: 12,
    floor: 2,
    shape: "subset",
    sldr: "a b c d e f g h i j k l m n o p q r s t u v x y z á í ó ʼ",
    books_: "a b c d e f g h i j k l m n o p q r s t u v x y z á ʼ",
    onlySldr: "í ó",
    onlyBooks: "",
    reading: "A strict subset, and the whole difference is `í ó`. Ixil books do not carry the Spanish accents the orthography lists.",
  },
  {
    tag: "ha-Latn",
    name: "Hausa",
    sldrTag: "ha",
    variantCount: 2,
    books: 12,
    floor: 2,
    shape: "subset",
    sldr: "a b c d e f g h i j k l m n o r s sh t ts u w y z ƙ ƴ ɓ ɗ ʼ",
    books_: "a b c d e f g h i j k l m n o r s t u w y z ƙ ɓ ɗ ʼ",
    onlySldr: "sh ts ƴ",
    onlyBooks: "",
    reading: "A strict subset. Two of the three missing, `sh` and `ts`, are written with two characters each, and nothing in the text says two characters are one letter, so this scan cannot see them. `ƴ` simply did not occur in twelve books.",
  },
  {
    tag: "atb-Latn",
    name: "Zaiwa",
    sldrTag: "atb",
    variantCount: 1,
    books: 4,
    floor: 2,
    shape: "partial",
    sldr: "a b c d e g h i j k l m n o p q r s t u w x y z ̀ ́ ̂",
    books_: "a b c d e f g h i j k l m n o p q r s t u w x y z à á â è é ê ì í î ò ó ô ù ú û",
    onlySldr: "̀ ́ ̂",
    onlyBooks: "f à á â è é ê ì í î ò ó ô ù ú û",
    reading: "The largest disagreement of form rather than of content anywhere here. Zaiwa's SLDR set writes its tones as three bare combining marks; the books, and this scan, carry the sixteen precomposed accented vowels those marks produce. Both sides describe the same characters on the page. 310 of the 1,654 Latin-script SLDR sets are written the SLDR's way, so about a fifth of Latin-script languages will look like this.",
  },
  {
    tag: "jra-Latn",
    name: "Jarai",
    sldrTag: "jra",
    variantCount: 1,
    books: 7,
    floor: 2,
    shape: "partial",
    sldr: "a b d dj e g h i j k l m n ng o p r s t u w y â ê ê̆ ñ ô ô̆ ă č đ ĕ ĭ ŏ ŭ ƀ ơ ơ̆ ư ư̆",
    books_: "a b c d e f g h i j k l m n o o̱ p r s t u w y â ñ ô ă č đ ĕ ĭ ŏ ŭ ƀ ơ ơ̆ ư ư̆",
    onlySldr: "dj ng ê ê̆ ô̆",
    onlyBooks: "c f o̱",
    reading: "Missing `dj` and `ng`, which are digraphs and out of reach, and `ê ê̆ ô̆`, which seven books did not use. Jarai is the case that proves precomposed Latin letters survive: `ơ̆` and `ư̆`, which Unicode has no single character for, came through whole.",
  },
  {
    tag: "aph-Deva",
    name: "Athpariya",
    sldrTag: "aph",
    variantCount: 1,
    books: 4,
    floor: 2,
    shape: "partial",
    sldr: "ँ ं अ आ इ उ ए ओ औ क ख ग घ ङ च छ ज झ ट ठ ड ढ त थ द ध न प फ ब भ म य र ल व स ह ा ि ु े ै ो ौ ् ॽ",
    books_: "ँ ः आ इ उ ए ओ क ख ग घ ङ च छ ज ट ठ ड ढ त द ध न प फ ब भ म य र ल व स ह ा ि ु े ै ो ् ॽ",
    onlySldr: "ं अ औ झ थ ौ",
    onlyBooks: "ः",
    reading: "41 of 47 from four books. The six missing are ordinary Devanagari letters that four short books had no occasion for. `ः` is the one thing the books add, twice.",
  },
  {
    tag: "mam-Latn",
    name: "Mam",
    sldrTag: "mam",
    variantCount: 3,
    books: 12,
    floor: 4,
    shape: "subset",
    sldr: "a b c d e f g h i j k l m n o p q r s t u v w x y z á é í ñ ó ú ẍ ʼ",
    books_: "a b c d e f g h i j k l m n o p q r s t u v w x y z ó ʼ ẍ",
    onlySldr: "á é í ñ ú",
    onlyBooks: "",
    reading: "A strict subset, and the entire difference is `á é í ñ ú`. This is the case worth understanding before reading any of the others: Mam books published for schools do not use the accents their orthography lists. The SLDR is right about the orthography and the books are right about the practice.",
  },
  {
    tag: "km-Khmr",
    name: "Khmer",
    sldrTag: "km",
    variantCount: 1,
    books: 12,
    floor: 2,
    shape: "partial",
    sldr: "ក ខ គ ឃ ង ច ឆ ជ ឈ ញ ដ ឋ ឌ ឍ ណ ត ថ ទ ធ ន ប ផ ព ភ ម យ រ ល វ ស ហ ឡ អ អា ឥ ឦ ឧ ឧក ឩ ឪ ឫ ឬ ឭ ឮ ឯ ឰ ឱ ឲ ឳ ា ិ ី ឹ ឺ ុ ូ ួ ើ ឿ ៀ េ ែ ៃ ោ ៅ ំ ះ ៈ ៉ ៊ ់ ៍ ័ ្",
    books_: "ក ខ គ ឃ ង ច ឆ ជ ឈ ញ ដ ឌ ណ ត ថ ទ ធ ន ប ផ ព ភ ម យ រ ល វ ស ហ ឡ អ ឥ ឪ ឫ ឬ ឯ ឱ ឲ ា ិ ី ឹ ឺ ុ ូ ួ ើ ឿ ៀ េ ែ ៃ ោ ៅ ំ ះ ៉ ៊ ់ ៍ ៏ ្ ៗ",
    onlySldr: "ឋ ឍ អា ឦ ឧ ឧក ឩ ឭ ឮ ឰ ឳ ៈ ័",
    onlyBooks: "៏ ៗ",
    reading: "61 of 74. Most of the thirteen missing are independent vowels that appear in a handful of words, plus two rare consonants. Of the two the books add, `ៗ` is the repetition sign and is not a letter at all, and `៏` is a rare diacritic.",
  },
  {
    tag: "th-Thai",
    name: "Thai",
    sldrTag: "th",
    variantCount: 1,
    books: 12,
    floor: 6,
    shape: "subset",
    sldr: "ก ข ฃ ค ฅ ฆ ง จ ฉ ช ซ ฌ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ฤ ล ฦ ว ศ ษ ส ห ฬ อ ฮ ฯ ะ ั า ำ ิ ี ึ ื ุ ู ฺ เ แ โ ใ ไ ๅ ๆ ็ ่ ้ ๊ ๋ ์ ํ ๎",
    books_: "ก ข ค ฆ ง จ ฉ ช ซ ญ ฎ ฏ ฐ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ล ว ศ ษ ส ห อ ฮ ะ ั า ิ ี ึ ื ุ ู เ แ โ ใ ไ ๆ ็ ่ ้ ๊ ๋ ์",
    onlySldr: "ฃ ฅ ฌ ฑ ฒ ฤ ฦ ฬ ฯ ำ ฺ ๅ ํ ๎",
    onlyBooks: "",
    reading: "A strict subset, 59 of 73. What is missing is the rare end of Thai: five low-frequency consonants, two vocalic letters, and signs such as `ฯ` and `ฺ` that belong to formal or Pali-derived writing rather than to children's books.",
  },
  {
    tag: "ne-Deva",
    name: "Nepali (macrolanguage)",
    sldrTag: "ne",
    variantCount: 1,
    books: 12,
    floor: 2,
    shape: "subset",
    sldr: "ँ ं ः अ आ इ ई उ ऊ ऋ ऌ ऍ ए ऐ ऑ ओ औ क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल ळ व श ष स ह ़ ऽ ा ि ी ु ू ृ ॅ े ै ॉ ो ौ ् ॐ",
    books_: "ँ ं ः अ आ इ ई उ ऊ ए औ क ख ग घ ङ च छ ज झ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह ा ि ी ु ू ृ े ै ो ौ ्",
    onlySldr: "ऋ ऌ ऍ ऐ ऑ ओ ञ ळ ़ ऽ ॅ ॉ ॐ",
    onlyBooks: "",
    reading: "A strict subset, 54 of 67. Two of the thirteen missing, `ओ` and `ऐ`, are common Nepali letters. Their absence says twelve books is not enough rather than that anything is wrong with the reading.",
  },
  {
    tag: "bn-Beng",
    name: "Bengali",
    sldrTag: "bn",
    variantCount: 1,
    books: 12,
    floor: 3,
    shape: "partial",
    sldr: "ঁ ং ঃ অ আ ই ঈ উ ঊ ঋ ঌ এ ঐ ও ঔ ক ক্ষ খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ড় ঢ ঢ় ণ ত থ দ ধ ন প ফ ব ভ ম য য় র ল শ ষ স হ ় ঽ া ি ী ু ূ ৃ ৄ ে ৈ ো ৌ ্ ৎ ৗ ৠ ৡ ৢ ৣ ৺",
    books_: "ʼ ঁ ং ঃ অ আ ই উ ঋ এ ও ক খ গ ঘ ঙ চ ছ জ ঝ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ় া ি ী ু ূ ৃ ে ৈ ো ৌ ্ ৎ",
    onlySldr: "ঈ ঊ ঌ ঐ ঔ ক্ষ ঞ ড় ঢ় য় ঽ ৄ ৗ ৠ ৡ ৢ ৣ ৺",
    onlyBooks: "ʼ",
    reading: "54 of 72. Eleven of the eighteen missing are letters the SLDR writes as a base plus a nukta or as a conjunct, `ড় ঢ় য় ক্ষ`, and this scan reports only their parts. The rest are rare independent vowels. The one addition is an apostrophe, ten occurrences.",
  },
  {
    tag: "am-Ethi",
    name: "Amharic",
    sldrTag: "am",
    variantCount: 1,
    books: 4,
    floor: 14,
    shape: "subset",
    sldr: "ሀ ሁ ሂ ሃ ሄ ህ ሆ ለ ሉ ሊ ላ ሌ ል ሎ ሏ ሐ ሑ ሒ ሓ ሔ ሕ ሖ ሗ መ ሙ ሚ ማ ሜ ም ሞ ሟ ሠ ሡ ሢ ሣ ሤ ሥ ሦ ሧ ረ ሩ ሪ ራ ሬ ር ሮ ሯ ሰ ሱ ሲ ሳ ሴ ስ ሶ ሷ ሸ ሹ ሺ ሻ ሼ ሽ ሾ ሿ ቀ ቁ ቂ ቃ ቄ ቅ ቆ ቈ ቊ ቋ ቌ ቍ በ ቡ ቢ ባ ቤ ብ ቦ ቧ ቨ ቩ ቪ ቫ ቬ ቭ ቮ ቯ ተ ቱ ቲ ታ ቴ ት ቶ ቷ ቸ ቹ ቺ ቻ ቼ ች ቾ ቿ ኀ ኁ ኂ ኃ ኄ ኅ ኆ ኈ ኊ ኋ ኌ ኍ ነ ኑ ኒ ና ኔ ን ኖ ኗ ኘ ኙ ኚ ኛ ኜ ኝ ኞ ኟ አ ኡ ኢ ኣ ኤ እ ኦ ኧ ከ ኩ ኪ ካ ኬ ክ ኮ ኰ ኲ ኳ ኴ ኵ ኸ ኹ ኺ ኻ ኼ ኽ ኾ ወ ዉ ዊ ዋ ዌ ው ዎ ዐ ዑ ዒ ዓ ዔ ዕ ዖ ዘ ዙ ዚ ዛ ዜ ዝ ዞ ዟ ዠ ዡ ዢ ዣ ዤ ዥ ዦ ዧ የ ዩ ዪ ያ ዬ ይ ዮ ደ ዱ ዲ ዳ ዴ ድ ዶ ዷ ጀ ጁ ጂ ጃ ጄ ጅ ጆ ጇ ገ ጉ ጊ ጋ ጌ ግ ጎ ጐ ጒ ጓ ጔ ጕ ጠ ጡ ጢ ጣ ጤ ጥ ጦ ጧ ጨ ጩ ጪ ጫ ጬ ጭ ጮ ጯ ጰ ጱ ጲ ጳ ጴ ጵ ጶ ጷ ጸ ጹ ጺ ጻ ጼ ጽ ጾ ጿ ፀ ፁ ፂ ፃ ፄ ፅ ፆ ፈ ፉ ፊ ፋ ፌ ፍ ፎ ፏ ፐ ፑ ፒ ፓ ፔ ፕ ፖ ፗ",
    books_: "ሀ ሁ ሃ ሄ ህ ሆ ለ ሉ ሊ ላ ሌ ል ሎ ሏ ሐ ሑ ሔ ሕ መ ሙ ሚ ማ ሜ ም ሞ ሠ ሣ ሥ ሦ ረ ሩ ሪ ራ ሬ ር ሮ ሯ ሰ ሱ ሲ ሳ ሴ ስ ሶ ሷ ሸ ሹ ሻ ሽ ሾ ቀ ቁ ቂ ቃ ቄ ቅ ቆ ቋ በ ቡ ቢ ባ ቤ ብ ቦ ቧ ተ ቱ ቲ ታ ቴ ት ቶ ቷ ቸ ቹ ቺ ቻ ች ኃ ኄ ኅ ኋ ነ ኑ ኒ ና ኔ ን ኖ ኗ ኘ ኙ ኛ ኝ ኞ አ ኢ ኤ እ ከ ኩ ኪ ካ ኬ ክ ኮ ኳ ወ ዊ ዋ ው ዎ ዓ ዕ ዖ ዘ ዙ ዚ ዛ ዜ ዝ ዞ ዣ ዥ የ ዩ ያ ዬ ይ ዮ ደ ዱ ዲ ዳ ዴ ድ ዶ ጀ ጁ ጂ ጃ ጅ ጆ ገ ጉ ጊ ጋ ጌ ግ ጎ ጓ ጠ ጡ ጢ ጣ ጤ ጥ ጦ ጨ ጩ ጫ ጭ ጮ ጲ ጴ ጸ ጹ ጻ ጽ ጾ ፀ ፃ ፅ ፈ ፉ ፊ ፋ ፍ ፎ",
    onlySldr: "ሂ ሒ ሓ ሖ ሗ ሟ ሡ ሢ ሤ ሧ ሺ ሼ ሿ ቈ ቊ ቌ ቍ ቨ ቩ ቪ ቫ ቬ ቭ ቮ ቯ ቼ ቾ ቿ ኀ ኁ ኂ ኆ ኈ ኊ ኌ ኍ ኚ ኜ ኟ ኡ ኣ ኦ ኧ ኰ ኲ ኴ ኵ ኸ ኹ ኺ ኻ ኼ ኽ ኾ ዉ ዌ ዐ ዑ ዒ ዔ ዟ ዠ ዡ ዢ ዤ ዦ ዧ ዪ ዷ ጄ ጇ ጐ ጒ ጔ ጕ ጧ ጪ ጬ ጯ ጰ ጱ ጳ ጵ ጶ ጷ ጺ ጼ ጿ ፁ ፂ ፄ ፆ ፌ ፏ ፐ ፑ ፒ ፓ ፔ ፕ ፖ ፗ",
    onlyBooks: "",
    reading: "The weakest coverage here, 180 of 282, and the most understandable. Amharic's syllabary is large, four books reach two thirds of it, and the frequency floor sits at 14 occurrences. There is simply far more alphabet than four books use.",
  },
  {
    tag: "quc-Latn",
    name: "K’iche’",
    sldrTag: "quc",
    variantCount: 2,
    books: 12,
    floor: 2,
    shape: "partial",
    sldr: "a aʼ bʼ ch chʼ e eʼ i iʼ j k kʼ l m n o p q qʼ r s t tz tzʼ tʼ u uʼ v w x y ä",
    books_: "a b c d e h i j k l m n o p q r s t u w x y z ʼ",
    onlySldr: "aʼ bʼ ch chʼ eʼ iʼ kʼ qʼ tz tzʼ tʼ uʼ v ä",
    onlyBooks: "b c d h z ʼ",
    reading: "The worst agreement, 18 of 32, and the reason is structural rather than accidental. Twelve of the SLDR's entries are digraphs built with the glottal apostrophe, `aʼ bʼ chʼ kʼ qʼ tzʼ`, and the scan reports the pieces, `b c h ʼ`. This is what the digraph limit costs when an orthography is built out of digraphs.",
  },
];

export const entries = (list: string): string[] =>
  list.split(" ").filter(Boolean);

export const SHAPE_LABEL: Record<Shape, string> = {
  covers: "Books cover the SLDR, and add",
  subset: "Books are a subset",
  partial: "Partial overlap",
};
