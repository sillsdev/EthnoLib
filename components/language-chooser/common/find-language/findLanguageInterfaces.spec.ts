import { describe, expect, it } from "vitest";
import { iso15924 } from "iso-15924";
import { isRTLScript } from "./findLanguageInterfaces";

describe("isRTLScript", () => {
  it("reports true for right-to-left scripts", () => {
    expect(isRTLScript("Arab")).toBe(true);
    expect(isRTLScript("Hebr")).toBe(true);
    expect(isRTLScript("Thaa")).toBe(true);
    expect(isRTLScript("Nkoo")).toBe(true);
    expect(isRTLScript("Adlm")).toBe(true);
  });

  it("reports false for left-to-right scripts", () => {
    expect(isRTLScript("Latn")).toBe(false);
    expect(isRTLScript("Cyrl")).toBe(false);
    expect(isRTLScript("Hans")).toBe(false);
    expect(isRTLScript("Deva")).toBe(false);
    expect(isRTLScript("Ethi")).toBe(false);
  });

  it("reports true for RTL scripts whose direction the runtime's ICU may not know yet", () => {
    // CLDR release-48-2 marks Sidetic RTL=YES, but Node 22's ICU reports it as
    // left-to-right. This assertion may start passing for the ordinary reason
    // once the host ICU picks up Unicode 16, at which point the pin for it in
    // RTL_SCRIPTS_UNKNOWN_TO_OLDER_ICU can be dropped.
    expect(isRTLScript("Sidt")).toBe(true);
  });

  it("takes the direction of the parent script for variant codes", () => {
    // Neither Intl nor CLDR has data for these, but a Nastaliq Arabic document
    // is still Arabic and Western Syriac is still Syriac. Intl reports all of
    // them as left-to-right. amw-Syrj (Western Neo-Aramaic) is reachable from a
    // search, making it the one genuinely user-facing fix here.
    expect(isRTLScript("Aran")).toBe(true); // Arabic (Nastaliq variant)
    expect(isRTLScript("Syre")).toBe(true); // Syriac (Estrangelo variant)
    expect(isRTLScript("Syrj")).toBe(true); // Syriac (Western variant)
    expect(isRTLScript("Syrn")).toBe(true); // Syriac (Eastern variant)
    expect(isRTLScript("Phlv")).toBe(true); // Book Pahlavi

    // Variants of left-to-right scripts must stay left-to-right, not become
    // unknown just because there is no data for the variant code itself.
    expect(isRTLScript("Cyrs")).toBe(false); // Cyrillic (Old Church Slavonic)
    expect(isRTLScript("Latf")).toBe(false); // Latin (Fraktur variant)
    expect(isRTLScript("Latg")).toBe(false); // Latin (Gaelic variant)
    expect(isRTLScript("Hans")).toBe(false); // Han (Simplified variant)
    expect(isRTLScript("Hant")).toBe(false); // Han (Traditional variant)
  });

  it("does not let a placeholder inherit a direction from its parent", () => {
    // Zsye is "Symbols (Emoji variant)", so the variant derivation would map it
    // to Zsym. Placeholders must keep their own answer instead.
    expect(isRTLScript("Zsye")).toBeUndefined();
  });

  it("does not invent a right-to-left direction for left-to-right scripts", () => {
    // Todhri is explicitly RTL=NO in CLDR scriptMetadata and Intl agrees.
    // sq-Todr is reachable from a search, so wrongly pinning this as RTL would
    // misrender real Albanian text. Guards against re-adding it as an override.
    expect(isRTLScript("Todr")).toBe(false);
    // Egyptian hieroglyphs are left-to-right per Unicode's Bidi_Class data.
    expect(isRTLScript("Egyp")).toBe(false);
  });

  it("keeps a usable direction for Braille", () => {
    // CLDR marks Braille RTL=UNKNOWN because it is script agnostic, but
    // Braille is read left to right, and 148 languages in our data offer it.
    expect(isRTLScript("Brai")).toBe(false);
  });

  it("reports unknown for placeholder script codes", () => {
    // Zxxx covers the sign languages in our data: not merely unknown
    // direction, but no written form at all.
    expect(isRTLScript("Zxxx")).toBeUndefined();
    expect(isRTLScript("Zzzz")).toBeUndefined();
    expect(isRTLScript("Zyyy")).toBeUndefined();
    expect(isRTLScript("Zinh")).toBeUndefined();
    expect(isRTLScript("Zmth")).toBeUndefined();
    expect(isRTLScript("Zsym")).toBeUndefined();
    expect(isRTLScript("Zsye")).toBeUndefined();
  });

  it("reports unknown for private use script codes", () => {
    expect(isRTLScript("Qaaa")).toBeUndefined();
    expect(isRTLScript("Qaap")).toBeUndefined();
    expect(isRTLScript("Qabx")).toBeUndefined();
  });

  it("reports unknown for codes that are not registered scripts", () => {
    // Well formed but unregistered. Intl answers "ltr" for these, which is a
    // guess rather than information.
    expect(isRTLScript("Xyzw")).toBeUndefined();
    expect(isRTLScript("Qzzz")).toBeUndefined();
  });

  it("reports unknown for empty or malformed codes", () => {
    expect(isRTLScript("")).toBeUndefined();
    expect(isRTLScript("xyz")).toBeUndefined();
    expect(isRTLScript("Latn-x")).toBeUndefined();
    expect(isRTLScript("not a script code")).toBeUndefined();
  });

  it("is not case sensitive", () => {
    expect(isRTLScript("arab")).toBe(true);
    expect(isRTLScript("ARAB")).toBe(true);
    expect(isRTLScript("latn")).toBe(false);
    expect(isRTLScript("zxxx")).toBeUndefined();
  });

  // Guards the placeholder and variant handling against accidentally
  // suppressing a real direction: whenever the runtime's own ICU data says a
  // script is right-to-left, we must answer true. Note this deliberately tests
  // for "not true" rather than "false" — returning undefined suppresses a real
  // direction just as effectively as returning false does.
  it("never suppresses a right-to-left direction the runtime reports", () => {
    const suppressed = iso15924
      .map(({ code }) => code)
      .filter((code) => {
        let intlSaysRtl = false;
        try {
          const locale = new Intl.Locale(`und-${code}`);
          const info =
            locale.getTextInfo?.() ??
            (locale as unknown as { textInfo?: { direction?: string } })
              .textInfo;
          intlSaysRtl = info?.direction === "rtl";
        } catch {
          return false;
        }
        return intlSaysRtl && isRTLScript(code) !== true;
      });

    expect(suppressed).toEqual([]);
  });
});
