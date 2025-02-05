// TODO Revisit this. There are a whole bunch more (maybe 2x more)
// languages marked "historical" which we should possibly also filter out; we should
// consider instead using a whitelist of historical langauges incl. ancient greeks,
// hebrews, latin, etc. and then removing all other languages marked "historical".
// If we could figure out what Ethnolib includes and copy that, that might be ideal.
// Looks like it includes the various ancient greek codes but not Old English etc.
//
// Neither the current Bloom language picker nor Greg Trihus's language picker exclude
// historical langauges like old english.
//
// TODO also generate DEFAULT_EXCLUDED_HISTORIC_LANGUAGE_CODES dynamically.

// languages with ISO 630-3 "historic" language type and "Old", "Middle", "Ancient", "Classical" in their name (exonym)
// except for Ancient Greek (grc), Ancient Hebrew (hbo), Old Aramaic (up to 700 BCE) (oar)
export const DEFAULT_EXCLUDED_HISTORIC_LANGUAGE_CODES = new Set([
  "ang", // Old English (ca. 450-1100)
  "axm", // Middle Armenian
  "cmg", // Classical Mongolian
  "cnx", // Middle Cornish
  "dum", // Middle Dutch (ca. 1050-1350)
  "egy", // Egyptian (Ancient)
  "enm", // Middle English (1100-1500)
  "frm", // Middle French (ca. 1400-1600)
  "fro", // Old French (842-ca. 1400)
  "gmh", // Middle High German (ca. 1050-1500)
  "gml", // Middle Low German
  "goh", // Old High German (ca. 750-1050)
  "htx", // Middle Hittite
  "ltc", // Late Middle Chinese
  "lzh", // Classical Chinese
  "mga", // Middle Irish (900-1200)
  "myz", // Classical Mandaic
  "nci", // Classical Nahuatl
  "non", // Old Norse
  "nwc", // Classical Newari
  "nwx", // Middle Newar
  "oav", // Old Avar
  "obr", // Old Burmese
  "obt", // Old Breton
  "och", // Old Chinese
  "ocm", // Old Cham
  "oco", // Old Cornish
  "odt", // Old Dutch
  "ofs", // Old Frisian
  "oge", // Old Georgian
  "oht", // Old Hittite
  "ohu", // Old Hungarian
  "ojp", // Old Japanese
  "okm", // Middle Korean (10th-16th cent.)
  "oko", // Old Korean (3rd-9th cent.)
  "okz", // Old Khmer
  "olt", // Old Lithuanian
  "omp", // Old Manipuri
  "omr", // Old Marathi
  "omx", // Old Mon
  "omy", // Old Malay
  "onw", // Old Nubian
  "oos", // Old Ossetic
  "orv", // Old Russian
  "osn", // Old Sundanese
  "osp", // Old Spanish
  "osx", // Old Saxon
  "otb", // Old Tibetan
  "otk", // Old Turkish
  "oty", // Old Tamil
  "oui", // Old Uighur
  "owl", // Old Welsh
  "peo", // Old Persian (ca. 600-400 B.C.)
  "pro", // Old Provençal (to 1500)
  "qwc", // Classical Quechua
  "sga", // Old Irish (to 900)
  "wlm", // Middle Welsh
  "xbm", // Middle Breton
  "xcl", // Classical Armenian
  "xct", // Classical Tibetan
  "xhm", // Middle Khmer (1400 to 1850 CE)
  "xlg", // Ligurian (Ancient)
  "xmk", // Ancient Macedonian
  "xmn", // Manichaean Middle Persian
  "xna", // Ancient North Arabian
  "xng", // Middle Mongolian
  "xzp", // Ancient Zapotec
]);

// function hasOldKeyword(lang: ILanguage) {
//     for (const oldKeyword of ["Old", "Middle", "Ancient", "Classical"]) {
//       if (lang.exonym.includes(oldKeyword)) {
//         return true;
//       }
//     }
//     return false;
//   }

//   for (const lang of reformattedLangs) {
//     if (lang.languageType === LanguageType.Historical && hasOldKeyword(lang)) {
//       console.log(lang.exonym, lang.iso639_3_code);
//     }
//   }
