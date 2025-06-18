import {fuzzilySearchForScripts} from "./searchForScript"
import {describe, expect, it} from "vitest"

describe("Fuzzy script search", () => {
    const searchOptions0 = [];
    const searchOptions1 = [{id:"id#1", label:"firstThing"},{id:"id#2", label:"secondThing"},{id:"id#3", label:"thirdThing"}];

    it("should return no results when using an empty string as the query", () => {
        const result = fuzzilySearchForScripts(searchOptions1, {inputValue:""});
        expect(result.length).toBe(0);
    });

    it("should return no results when searching an empty collection", () => {
        const result = fuzzilySearchForScripts(searchOptions0, {inputValue:"id#1"});
        expect(result.length).toBe(0);
    });

    it("should return an exact match of id as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, {inputValue:"id#1"});
        expect(result[0].label).toBe("firstThing");
    });

    it("should return an exact match of label as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, {inputValue:"firstThing"});
        expect(result[0].id).toBe("id#1");
    });

    it("should return a near match of id as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, {inputValue:"jd#1"});
        expect(result[0].label).toBe("firstThing");
    });

    it("should return a near match of label as the first result", () => {
        const result = fuzzilySearchForScripts(searchOptions1, {inputValue:"firtThig"});
        expect(result[0].id).toBe("id#1");
    });
})