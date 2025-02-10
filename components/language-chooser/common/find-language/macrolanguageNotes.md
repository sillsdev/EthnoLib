# About macrolanguage handling

This is about ISO 639-3 codes which represent collections of languages and have a one-to-many correspondence with ISO 630-3 codes which denote individual languages.

See also

  <!-- - https://issues.bloomlibrary.org/youtrack/issue/BL-12657/Issues-with-macrolanguage-codes-in-the-language-picker -->

- https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages
- https://iso639-3.sil.org/code_tables/macrolanguage_mappings/

According to the langtags.json documentation:

> For many macro languages, there is a representative language for that macro language. In many cases the macro language code is more popular than the representative langauge code. Thus, for example, in the CLDR, the macro language code is used instead of the representative language code. For this reason, langtags.json unifies the representative language tags into the macro language tag set rather than having a separate tag set for them, and gives the tag for the tag set in terms of the macro language rather than the representative language. (https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages)

> We follow CLDR in giving every macro language a default concrete language that is mapped to it. Thus, for example: _ps = pbu = pbu-AF = pbu-Arab = pbu-Arab-AF = \*ps-AF = ps-Arab = ps-Arab-AF_ which says that while Pashto is a macro language, the default language in that set is Northern Pashto and that Northern Pashto will be mapped to the macro language due to their equivalence. (https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#macro-languages-1)

A illustrative example of how this library handles macrolanguages: For the macrolanguage `pus` (Pashto), there are 4 relevant entries in langtags.json (listed below). From the first (ps-Arab-AF), we can detect that `pus`/`ps` is mapped to/equivalent to representative language `pbu` as described above. (`ps` is the ISO 639-1 equivalent of `pus`.) We therefore know the second entry (ps-Arab-PK) is also for language `pbu`. Since this language chooser delineates languages firstly by their ISO 639-3 codes, we combine the first two entries. We mark the result with `isRepresentativeForMacrolang: pus`. The `pbt` and `pst` entries we straightforwardly handle as normal individual languages.

There are a few entries in langtags.json for which we cannot straightforwardly determine the individual language. These we mark with `isRepresentativeForMacrolang: unknown` and keep the iso639-3 code despite it being a macrolanguage code. For the react language chooser, the desired behavior for these situations should be handled in search result modifiers. As of January 2025, these entries are `bnc`, `nor`, `san`, `hbs`, and `zap`. Other unusual situations we are aware of are `aka` and `zhx`, these may also warrant special checking.

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
