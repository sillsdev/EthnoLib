# About macrolanguage handling

**Macrolanguages in ISO 639-3 are codes which represent a group of closely related individual languages.** They exist when each of the individual languages fit the ISO 639-3 criteria for distinct languages and yet there is "some domain in which only a single language identity is recognized". An example from the ISO 639-3 docs: "There are several distinct spoken Arabic languages, but Standard Arabic is generally used in business and media across all of these communities, and is also an important aspect of a shared ethno-religious unity. As a result, a perceived common linguistic identity exists." Macro language codes thus have a one-to-many correspondence with individual language ISO 630-3 codes.

See also

  <!-- - https://issues.bloomlibrary.org/youtrack/issue/BL-12657/Issues-with-macrolanguage-codes-in-the-language-picker -->

- https://writingsystems.info/topics/writingsystems/language-tagging/#macrolanguages

- https://iso639-3.sil.org/about/scope#Macrolanguages
- https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages
- https://iso639-3.sil.org/code_tables/macrolanguage_mappings/

**This language chooser is primarily designed for the selection of individual languages. We only include macrolanguage results when the search matches the ISO code (639-3 or 639-1) or primary exonym of the macrolanguage.**

In the CLDR and other popular usage, macrolanguage codes are often treated as equivalent alias codes for one of the individual languages, and are in fact preferred to the individual language code. As explained by the langtags.json documentation: "For many macro languages, there is a representative language for that macro language. In many cases the macro language code is more popular than the representative language code. Thus, for example, in the CLDR, the macro language code is used instead of the representative language code." (https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages) **However, in this language chooser, to avoid ambiguity, we never use macrolanguage codes for individual languages, even for languages where it is common to do so e.g. in the CLDR.** For example, we use `swa` only for the Swahili macrolanguage, and individual language code `swh` for the Swahili individual language; and we use `ps` only for the macrolanguage Pashto, and individual language code `pbu` for the individual language of Northern Pashto.

## When using this package

This package produces results in the form of `ILanguage` objects, which have 3 properties related to macrolanguages:

- `isMacrolanguage?: boolean;` Currently this is true if the result is a macrolanguage, and may be undefined otherwise. **Software using this package should indicate to users that these are macrolanguages.** Otherwise they may look like duplicates of other language results.

- `parentMacrolanguage?: ILanguage;` If this language result is a member of a macrolanguage, a language object for that macrolanguage. We use this to include member languages whenever a user searches for a macrolanguage. As of March 2025, the parentMacrolanguage lacks scripts and other data, we put just enough info to facilitate searching.

- `isRepresentativeForMacrolanguage?: boolean;` This is an individual language which the parent macrolanguage code is sometimes used to represent; see section above.

**If `isMacrolanguage` and `isRepresentativeForMacrolanguage` are both true, this language is an unusual case/anomaly in the data, which probably needs special handling.** As of February 2025 we have 5 such cases: `bnc`, `nor`, `san`, `hbs`, and `zap`.

**Chinese is also a special case. In the default modifier, we make it so there is one result for the Chinese language, with code `zh`, not marked as a macrolanguage. See searchResultModifiers.ts and the README.md.**

## How we use the [langtags repo](https://github.com/silnrsi/langtags/blob/master/doc/langtags.md) data

The language data we use is primarily based on [langtags.json](https://ldml.api.sil.org/langtags.json), which oftentimes lists the "representative language" data with the macrolanguage tag. From their documentation: ["Langtags.json unifies the representative language tags into the macro language tag set rather than having a separate tag set for them, and gives the tag for the tag set in terms of the macro language rather than the representative language."](https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages) **We incorporate all entries in langtags.json into individual languages, not macrolanguages, for our language results.** We are typically able to determine the individual language code from the "tags" field where it is in the list of equivalent tags, and so ensure that each of the language choices we offer the user are unique individual languages.

For example: For the macrolanguage `pus` (Pashto), there are 4 relevant entries in langtags.json (listed below). From the first (ps-Arab-AF), we can detect that `pus`/`ps` is mapped to/equivalent to representative language `pbu` as described above. (`ps` is the ISO 639-1 equivalent of `pus`.) We therefore know the second entry (ps-Arab-PK) is also for language `pbu`. Since this language chooser delineates languages firstly by their ISO 639-3 codes, we combine the first two entries. We mark the result with `aliasMacrolanguage: pus`. The `pbt` and `pst` entries we straightforwardly handle as normal individual languages.

```
    {
        "full": "ps-Arab-AF",
        "iana": [ "Pushto", "Pashto" ],
        "iso639_3": "pus",
        "latnnames": [ "Pashto" ],
        "localname": "پښتو",
        "localnames": [ "پښتو" ],
        "name": "Pushto",
        "names": [ "Afghan", "Eastern Afghan Pashto", "Northwestern Pakhto", "Pakhto", "Pakhtoo", "Pakhtoon", "Pakhtun", "Paktu", "Pashto", "Pashto, Northern", "Pashtoon", "Pashtu", "Passtoo", "Pusto", "Sharqi", "Yousafzai Pashto", "Yusufzai Pashto" ],
        "region": "AF",
        "regionname": "Afghanistan",
        "regions": [ "AE", "CA", "IN", "US" ],
        "script": "Arab",
        "sldr": true,
        "suppress": true,
        "tag": "ps",
        "tags": [ "pbu", "pbu-AF", "pbu-Arab", "pbu-Arab-AF", "ps-AF", "ps-Arab" ],
        "windows": "ps"
    },
    {
        "full": "ps-Arab-PK",
        "iana": [ "Pushto", "Pashto" ],
        "iso639_3": "pus",
        "localname": "پښتو",
        "name": "Pushto",
        "names": [ "Pashto" ],
        "region": "PK",
        "regionname": "Pakistan",
        "script": "Arab",
        "sldr": true,
        "tag": "ps-PK",
        "windows": "ps-Arab-PK"
    },
    {
        "full": "pbt-Arab-AF",
        "iana": [ "Southern Pashto" ],
        "iso639_3": "pbt",
        "latnnames": [ "Pax̌tō" ],
        "localnames": [ "پښتو" ],
        "macrolang": "ps",
        "name": "Pashto, Southern",
        "names": [ "Kandahari Pashto", "Paktu", "Pashtu", "Pushto", "Pushtu", "Qandahari Pashto", "Quetta-Kandahari Pashto", "Southern Pashto", "Southwestern Pashto" ],
        "region": "AF",
        "regionname": "Afghanistan",
        "regions": [ "AE", "IR", "PK", "TJ", "TM" ],
        "script": "Arab",
        "sldr": false,
        "tag": "pbt",
        "tags": [ "pbt-AF", "pbt-Arab" ],
        "windows": "pbt-Arab"
    },
    {
        "full": "pst-Arab-PK",
        "iana": [ "Central Pashto" ],
        "iso639_3": "pst",
        "latnnames": [ "Pashto" ],
        "localnames": [ "پښتو" ],
        "macrolang": "ps",
        "name": "Pashto, Central",
        "names": [ "Central Pashto", "Mahsudi" ],
        "region": "PK",
        "regionname": "Pakistan",
        "script": "Arab",
        "sldr": false,
        "tag": "pst",
        "tags": [ "pst-Arab", "pst-PK" ],
        "windows": "pst-Arab"
    },
```

### Stripping the "(macrolanguage)" Parentheticals

Some entries in langtags.json contain "macrolanguage" in the language name, and yet contain the only data present for the representative language for that macrolanguage. For example, Dogri macrolanguage code is doi and Dogri individual language code is dgo. There are 4 entries with "iso639_3": "doi", all of which have "name": "Dogri (macrolanguage)", and dgo tags in the tags field which lists equivalent tags. The code dgo does not appear anywhere in langtags.json outside of these 4 entries. We are therefore interpreting data from these entries as applying to the individual language, and simply stripping "(macrolanguage)" wherever we find it. When we create macrolanguage search results, we set `isMacrolanguage=true`.

### Anomalies and Special Situations

Last updated September 2025. These should be specially checked and handled as our language data may be weird or inaccurate.

- `aka` - From the ISO 639-3 site, [Akan is a macrolanguage](https://iso639-3.sil.org/code/aka) (ISO639-3: `aka`; ISO639-1: `ak`) containing individual languages Twi (ISO639-3: `twi`; ISO639-1: `tw`) and Fanti (ISO639-3: `fat`). The langtags.json entry lists `ak`, `fat`, and `tw` as equivalent and provides no names other than "Akan". In Ethnologue, [Akan has a page](https://www.ethnologue.com/language/aka/) that lists Twi and Fanti as mutually intelligible dialects, among others.

  Since we don't have enough data from langtags.json to make any individual language entries ("Akan" is the only name present for this language; there are no Twi or Fanti entries, as is consistent with Ethnologue), we give only one result, namely Akan, with codes "aka" and "ak" but don't mark it as a macrolanguage. For now this is somewhat consistent with Ethnologue, which treats it as a single language, and there is no point discouraging people from using it in the absence of alternatives.

  See also https://unicode-org.atlassian.net/browse/CLDR-10293 and https://unicode-org.atlassian.net/browse/CLDR-17323; The current langtags.json handling of these languages might not be desired or permanent.

- `hbs` - [Serbo-Croatian is a macrolanguage](https://iso639-3.sil.org/code/hbs) (ISO639-3: `hbs`; ISO639-1: `sh`) containing individual languages Bosnian (ISO639-3: `bos`; ISO639-1: `bs`), Montenegrin(ISO639-3: `cnr`), Croatian(ISO639-3: `hrv`; ISO639-1: `hr`) and Serbian(ISO639-3: `srp`; ISO639-1: `sr`). Contrary to its usual behavior, langtags.json has a separate entry for Serbo-Croatian which that is not mappable to any individual language.

  We straightforwardly give an `hbs` macrolanguage result as well as all the individual language results as per usual.

- `nor` - [Norwegian is a macrolanguage](https://iso639-3.sil.org/code/nor) (ISO639-3: `nor`; ISO639-1: `no`) with child languages Bokmål (ISO639-3: `nob`; ISO639-1: `nb`) and Nynorsk (ISO639-3: `nno`; ISO639-1: `nn`), but [Ethnologue treats it as a single language](https://www.ethnologue.com/language/nor/) and says "Norwegian has 2 written standards, both of which are assigned codes in the ISO 639-3 standard: Bokmål Norwegian (nob) and Nynorsk Norwegian (nno)."

  Currently we give `nor` as a macrolanguage as well as `nob` and `nno` as individual languages.

- `san` - [Sanskrit is a macrolanguage](https://iso639-3.sil.org/code/san) (ISO639-3: `san`; ISO639-1: `sa`) with child languages child languages Classical Sanskrit (`cls`) and Vedic Sanskrit (`vsn`). It has a single [Ethnologue page](https://www.ethnologue.com/language/san/) which states "Sanskrit has 2 individual historical languages, both of which are assigned codes in the ISO 639-3 standard: Classical Sanskrit (cls) and Vedic Sanskrit (vsn)."

  Since we have no differentiated information on `cls` or `vsn` from langtags.json and there is only 1 Ethnologue page, for now we are giving a single entry for Sanskrit and not marking it as a macrolanguage.

- `zap` - [Zapotec is a macrolanguage](https://iso639-3.sil.org/code/zap) with many child languages. Due to a known error, two of its child languages, Isthmus Zapotec (`zai`) and Las Delicias Zapotec (`zcd`) are currently being conflated in langtags.json, so both of their data shows up in a single zap entry. Langtags.json has an entry for `zap-Latn-MX` which lists `zap`, `zai`, and `zcd` as equivalent. The `zai` [Ethnologue page](https://www.ethnologue.com/language/zai/) has "Dialects - None known. 18% intelligibility of Santa María Petapa [zpe] (most similar). A member of macrolanguage Zapotec [zap]". The `zcd` [Ethnologue page](https://www.ethnologue.com/language/zcd/) has "Dialects - None known. Reportedly most similar to Rincón Zapotec [zar]. A member of macrolanguage Zapotec [zap]". CLDR lists "zai" to "zap" for macrolanguage (but doesn't mention "zcd").

  For now we remove the names which obviously refer to Las Delicias Zapotec or Isthmus Zapotec from the `zap` macrolanguage card; `zai` and `zcd` do not have their own cards. We hope the bug causing the langtags.json error will be resolved soon.

- `zhx` - [This is a ISO 639-5 Collective code](https://iso639-3.sil.org/code/zhx) which has an entry in langtags.json with script with script `nshu`. It does not have an ethnologue page and is the only ISO 639-5 code that we have found in langtags.json.

  We do not include `zhx` in our search results.
