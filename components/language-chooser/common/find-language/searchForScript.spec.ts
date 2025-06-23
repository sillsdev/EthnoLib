import { IScript } from "./findLanguageInterfaces";
import {fuzzilySearchForScripts} from "./searchForScript"
import {describe, expect, it} from "vitest"

describe("Fuzzy script search", () => {
    const searchOptions0 = [];
    const searchOptions1 = [
        {code:"id#1", name:"firstThing"} as IScript,
        {code:"id#2", name:"secondThing"} as IScript,
        {code:"id#3", name:"thirdThing"} as IScript
    ];

    it("should return no results when using an empty string as the query", () => {
        const result = fuzzilySearchForScripts(searchOptions1, "");
        expect(result.length).toBe(0);
    });

    it("should return no results when searching an empty collection", () => {
        const result = fuzzilySearchForScripts(searchOptions0, "id#1");
        expect(result.length).toBe(0);
    });

    it("should return an exact match of id as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, "id#1");
        expect(result[0].name).toBe("firstThing");
    });

    it("should return an exact match of label as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, "firstThing");
        expect(result[0].code).toBe("id#1");
    });

    it("should return a near match of id as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, "jd#1");
        expect(result[0].name).toBe("firstThing");
    });

    it("should return a near match of label as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, "firtThig");
        expect(result[0].code).toBe("id#1");
    });

    const searchOptions2 = [
        {code:"22345678", name:"one character different"} as IScript,
        {code:"22346678", name:"two characters different"} as IScript,
        {code:"22356678", name:"three characters different"} as IScript        
    ]

    it("should order the results with closer fuzzy matches before further matches", () => {
        const result = fuzzilySearchForScripts(searchOptions2, "12345678");
        expect(result[0].name).toBe("one character different")
        expect(result[1].name).toBe("two characters different")
        expect(result[2].name).toBe("three characters different")
    });

    const searchOptions3 = [
        {code:"non-unique-id", name:"thing1"} as IScript,
        {code:"non-unique-id", name:"thing2"} as IScript,
        {code:"123", name:"extraneous item1"} as IScript,
        {code:"124", name:"extraneous item2"} as IScript
    ]

    it("should return multiple results that match the query", () => {
        const result = fuzzilySearchForScripts(searchOptions3, "non-unique-id");
        expect(result[0].name.substring(0, 5)).toBe("thing")
        expect(result[1].name.substring(0, 5)).toBe("thing")
    })
})