# About macrolanguage handling

TODO

<!-- > [!warning]
> Note much of the behavior described in this document has been backed out of the initial release of the language chooser and will be implemented in a future release.

- This is about ISO 639-3 codes which represent collections of languages and have a one-to-many correspondence with ISO 630-3 codes which denote individual languages.

- See also

  - https://issues.bloomlibrary.org/youtrack/issue/BL-12657/Issues-with-macrolanguage-codes-in-the-language-picker
  - https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages
  - https://iso639-3.sil.org/code_tables/macrolanguage_mappings/

### A simple (and somewhat typical) example of how macrolanguages appear to be handled in Langtags.json

`chm` (mari) is a macrolanguage which has individual languages `mhr` (Eastern Mari) and `mrj` (Western Mari). There are three relevant entries in Langtags.json, below. In this langauge chooser, the language options we offer users are based on the `iso639_3` field. The "Western Mari" entry is no problem and from it we create a language option with the "mrj" code. However, there is no entry which has `iso639_3` value `mhr`; but rather the two entries with `iso639_3` values of `chm` appear to be about the `mhr` language Western Mari. According to th langtags.json documentation: [For many macro languages, there is a representative language [in this case mhr] for that macro language [in this case chm]. In many cases the macro language code is more popular than the representative langauge code. Thus, for example, in the CLDR, the macro language code is used instead of the representative language code. For this reason, langtags.json unifies the representative language tags into the macro language tag set rather than having a separate tag set for them, and gives the tag for the tag set in terms of the macro language rather than the representative language.](https://github.com/silnrsi/langtags/blob/master/doc/langtags.md#macro-languages)

However, at least for the purposes of Bloom, we want the users to pick the specific language code. So since `mhr` is an ISO 639-3 code that shows up as an alternative tag in the `tags` field of those two entries, we create an additional language option which has code `mhr` but contains info from those two entries and therefore is otherwise a duplicate of the `chm` language option coallesced from these entries. (in languageData.json I have marked these additionally created entries with `isForMacrolanguageDisambiguation = true`). -->

<!-- TODO about adding the macrolanguage one to EXCLUDABLE_MACROLANGUAGE_ENTRY_CODES -->
<!--
```
    {
        "full": "mrj-Cyrl-RU",
        "iana": [ "Western Mari" ],
        "iso639_3": "mrj",
        "latnnames": [ "Kyryk mary jÿlmÿ", "Kyryk mary" ],
        "localnames": [ "Кырык мары йӹлмӹ", "кырык мары" ],
        "macrolang": "chm",
        "name": "Mari, Hill",
        "names": [ "Cheremis", "Gorno-Mariy", "High Mari", "Highland Mari", "Mari-Hills", "Western Mari" ],
        "region": "RU",
        "regionname": "Russian Federation",
        "script": "Cyrl",
        "sldr": false,
        "tag": "mrj",
        "tags": [ "mrj-Cyrl", "mrj-RU" ],
        "windows": "mrj-Cyrl"
    },
    ...
        {
        "full": "chm-Cyrl-RU",
        "iana": [ "Mari (Russia)" ],
        "iso639_3": "chm",
        "latnnames": [ "Olyk Marij", "Olyk Marij jylme" ],
        "localnames": [ "олык марий", "олык марий йылме" ],
        "name": "Mari (Russia)",
        "names": [ "Cheremis", "Cheremiss", "Cheremissian", "Eastern Cheremis", "Eastern Mari", "Low Mari", "Lowland Mari", "Lugovo Mari", "Mari", "Mari oriental", "Mari, Meadow", "Mari-Woods", "More", "Ostčeremissisch", "Szeremissi", "Tscheremissisch", "Woods Mari", "tchérémisse", "Čeremissisch" ],
        "region": "RU",
        "regionname": "Russian Federation",
        "regions": [ "KZ" ],
        "script": "Cyrl",
        "sldr": false,
        "tag": "chm",
        "tags": [ "chm-Cyrl", "chm-RU", "mhr", "mhr-Cyrl", "mhr-Cyrl-RU", "mhr-RU" ],
        "windows": "chm-Cyrl"
    },
    {
        "full": "chm-Latn-RU",
        "iana": [ "Mari (Russia)" ],
        "iso639_3": "chm",
        "name": "Mari (Russia)",
        "names": [ "Cheremis", "Cheremiss", "Cheremissian", "Eastern Cheremis", "Eastern Mari", "Low Mari", "Lowland Mari", "Lugovo Mari", "Mari", "Mari oriental", "Mari, Meadow", "Mari-Woods", "More", "Ostčeremissisch", "Szeremissi", "Tscheremissisch", "Woods Mari", "tchérémisse", "Čeremissisch" ],
        "region": "RU",
        "regionname": "Russian Federation",
        "regions": [ "KZ" ],
        "script": "Latn",
        "sldr": false,
        "tag": "chm-Latn",
        "tags": [ "mhr-Latn", "mhr-Latn-RU" ],
        "windows": "chm-Latn"
    },

``` -->
<!--
### A more complicated example -->

<!-- [`aka` (Akan) is a macro language which has individual languages `fat` (Fanti) and `twi` (Twi)](https://iso639-3.sil.org/code_tables/macrolanguage_mappings/data?code=aka&name=). However, [Akan itself is listed as a language in Ethnologue](https://www.ethnologue.com/language/aka/) and Fanti and Twi are only listed as dialects of Akan, though the page notes that "The two main subdivisions of Akan are assigned codes in the ISO 639-3 standard: Fanti (fat) and Twi (twi)." So it seems like (at least for the purposes of Bloom) we would want users to be able to pick `aka` even though it is technically a macrolanguage. And, the relevant entries in Langtags.json are as below. The `twi` code does not even show up anywhere in langtags.json at all.

```
   {
       "full": "ak-Latn-GH",
       "iana": [ "Akan" ],
       "iso639_3": "aka",
       "localname": "Akan",
       "localnames": [ "Akan" ],
       "name": "Akan",
       "region": "GH",
       "regionname": "Ghana",
       "regions": [ "AU", "CA", "GB", "LR", "NL" ],
       "script": "Latn",
       "sldr": true,
       "tag": "ak",
       "tags": [ "ak-GH", "ak-Latn", "fat", "fat-GH", "fat-Latn", "fat-Latn-GH", "tw", "tw-GH", "tw-Latn", "tw-Latn-GH" ],
       "variants": [ "akuapem", "asante" ],
       "windows": "ak-Latn"
   },
   {
       "full": "ak-Arab-GH",
       "iana": [ "Akan" ],
       "iso639_3": "aka",
       "name": "Akan",
       "nophonvars": true,
       "region": "GH",
       "regionname": "Ghana",
       "regions": [ "CA", "GB", "LR" ],
       "script": "Arab",
       "sldr": false,
       "tag": "ak-Arab",
       "windows": "ak-Arab"
   },
   {
       "full": "ak-Brai-GH",
       "iana": [ "Akan" ],
       "iso639_3": "aka",
       "name": "Akan",
       "nophonvars": true,
       "region": "GH",
       "regionname": "Ghana",
       "regions": [ "AU", "CA", "GB", "LR", "NL" ],
       "script": "Brai",
       "sldr": false,
       "tag": "ak-Brai",
       "tags": [ "tw-Brai", "tw-Brai-GH" ],
       "windows": "ak-Brai"
   },
```

TODO future work: For now, because we have at least one situation like this, we aren't blanket cutting out macrolanguages but should eventually figure out a way of determining which macrolanguages are actually valid options. -->

<!-- From the ISO 639-3 site, Akan is a macrolanguage with child languages Twi and Fanti. However, in Ethnologue, Akan has a page (https://www.ethnologue.com/language/aka/) that lists Twi and Fanti as dialects, but Twi and Fanti do not have pages. In fact, the ISO 639-3 site has links attempting to access nonexistent Twi and Fanti Ethnologue pages.

Relatedly, the names "Fanti" and "Twi" do not appear in connection to the ak/fat/tw languages in langtags.json, despite being the names given in ISO 639-3.

Another similar situation is Sanskrit, which is also listed as a macrolanguage in ISO 639-3, and yet it has an Ethnologue page which does not call it a macrolanguage, and its child languages (Classical Sanskrit - cls and Vedic Sanskrit - vsn) do not.

Are there other similar situations?

I am working on the language chooser for Bloom. We usually do not want users to select macrolanguages. Would it be a problem if users can select
languages "fat" and "twi" but not "aka" (at least not easily)?

And then multiple child codes zap Set(3) { 'zap', 'zai', 'zcd' } - ZAI and ZCD listed as equivalent despite ethnologue not even saying they are closest zapotecs to each other

del - us vs canada

nor - ???
 -->
