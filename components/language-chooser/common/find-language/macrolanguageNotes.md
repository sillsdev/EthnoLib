# About macrolanguage handling

**Macrolanguages in ISO 639-3 are codes which represent a group of closely related individual languages.** They exist when each of the individual languages fit the ISO 639-3 criteria for distinct languages and yet there is "some domain in which only a single language identity is recognized". An example from the ISO 639-3 docs: "There are several distinct spoken Arabic languages, but Standard Arabic is generally used in business and media across all of these communities, and is also an important aspect of a shared ethno-religious unity. As a result, a perceived common linguistic identity exists." Macro language codes thus have a one-to-many correspondence with individual language ISO 630-3 codes.

See also

  <!-- - https://issues.bloomlibrary.org/youtrack/issue/BL-12657/Issues-with-macrolanguage-codes-in-the-language-picker -->

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

There are a few entries in langtags.json for which we cannot straightforwardly determine the individual language. These we mark with `aliasMacrolanguage: unknown` and keep the iso639-3 code despite it being a macrolanguage code. For the react language chooser, the desired behavior for these situations should be handled in search result modifiers. As of February 2025, these entries are `bnc`, `nor`, `san`, `hbs`, and `zap`. Other unusual situations we are aware of are `aka` and `zhx`, these may also warrant special checking.

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
