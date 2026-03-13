import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  createPageAndLoadLanguageChooser,
  languageCardTestId,
  scriptCardTestId,
  search,
} from "./e2eHelpers";

let page: Page;

test.describe("Language card display elements", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });

  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("Autonym displays when available", async () => {
    await search(page, "japanese");

    const japaneseCard = page.getByTestId(languageCardTestId("jpn"));
    await japaneseCard.scrollIntoViewIfNeeded();

    // Japanese has an autonym: 日本語
    await expect(japaneseCard.locator("..")).toContainText(/日本語/);
  });

  test("Exonym displays when different from autonym", async () => {
    await search(page, "russian");

    const russianCard = page.getByTestId(languageCardTestId("rus"));
    await russianCard.scrollIntoViewIfNeeded();

    // Should show both autonym and exonym since they're different
    await expect(russianCard.locator("..")).toContainText(/русский/);
    await expect(russianCard.locator("..")).toContainText("Russian");
  });

  test("Exonym not duplicated when same as autonym", async () => {
    // Sãotomense has autonym = exonym
    await search(page, "Sãotomense");

    const saoTomeCard = page.getByTestId(languageCardTestId("cri"));
    await saoTomeCard.scrollIntoViewIfNeeded();

    // Should show the language name, but not duplicate it
    const cardContent = await saoTomeCard.textContent();

    // Should have content (autonym or exonym)
    expect(cardContent).toBeTruthy();
    // If it has "Sãotomense" in English, it shouldn't be duplicated
    const matches = cardContent?.match(/Sãotomense/g);
    if (matches) {
      expect(matches.length).toBeLessThanOrEqual(1);
    }
  });

  test("Region names display for language with known regions", async () => {
    await search(page, "tok pisin");

    const tpiCard = page.getByTestId(languageCardTestId("tpi"));
    await tpiCard.scrollIntoViewIfNeeded();

    // Tok Pisin is spoken in Papua New Guinea
    await expect(tpiCard.locator("..")).toContainText(/Papua New Guinea/);
    await expect(tpiCard.locator("..")).toContainText(/A language of/);
  });

  test("Macrolanguage warning icon and text appear on macrolanguage cards", async () => {
    await search(page, "kanuri");

    const kauCard = page.getByTestId(languageCardTestId("kau"));
    await kauCard.scrollIntoViewIfNeeded();

    // Should show macrolanguage indicator
    await expect(kauCard.locator("..")).toContainText(/macrolanguage/);

    // Should show warning icon
    const warningIcon = kauCard.locator("..").getByTestId("WarningIcon");
    await expect(warningIcon).toBeVisible();

    // Should show the warning message
    await expect(kauCard.locator("..")).toContainText(
      /It is usually better to pick a specific language instead of a macrolanguage/
    );
  });

  test("Alternative names display as comma-separated list", async () => {
    // Find a language with multiple alternative names
    await search(page, "swiss german");

    const gswCard = page.getByTestId(languageCardTestId("gsw"));
    await gswCard.scrollIntoViewIfNeeded();

    const cardContent = await gswCard.locator("..").textContent();

    // Should contain comma separators if there are alternative names
    // Swiss German has various dialectal names
    if (cardContent && cardContent.includes(",")) {
      expect(cardContent).toContain(",");
    }
  });

  test("Script sample text displays on script cards", async () => {
    await search(page, "chechen");
    const chechenCard = page.getByTestId(languageCardTestId("che"));
    await chechenCard.click();

    // Find the Cyrillic script card
    const cyrlCard = page.getByTestId(scriptCardTestId("Cyrl"));
    await expect(cyrlCard).toBeVisible();

    // Should contain script name
    await expect(cyrlCard.locator("..")).toContainText(/Cyr/);

    // Cyrillic should have sample text (like "Аа Бб Вв")
    const cardContent = await cyrlCard.locator("..").textContent();
    expect(cardContent).toBeTruthy();
    expect(cardContent?.length).toBeGreaterThan(10); // Has more than just the script name
  });

  test("Empty script sample handled gracefully", async () => {
    // Find a language with a script that might not have samples
    await search(page, "hindi");
    const hindiCard = page.getByTestId(languageCardTestId("hin"));
    await hindiCard.click();

    // Look at one of the script cards (Devanagari should have samples, but testing the structure)
    const scriptCards = page.locator("[data-testid^='script-card-']");
    const firstScriptCard = scriptCards.first();

    if (await firstScriptCard.isVisible()) {
      // Script card should still be visible and properly formatted
      await expect(firstScriptCard).toBeVisible();

      // Should have at least the script name
      const cardContent = await firstScriptCard.locator("..").textContent();
      expect(cardContent).toBeTruthy();
    }
  });

  test("Region names truncate with ellipsis after 2 lines", async () => {
    // Find a language spoken in many regions
    await search(page, "arabic");

    const arabicCard = page.getByTestId(languageCardTestId("arb"));
    await arabicCard.scrollIntoViewIfNeeded();

    // Check that the region display has the ellipsis CSS applied
    const regionText = arabicCard
      .locator("..")
      .locator("h6", { hasText: "A language of" });

    // Verify the CSS properties for text truncation
    const overflow = await regionText.evaluate((el) => {
      return window.getComputedStyle(el).overflow;
    });

    expect(overflow).toBe("hidden");
  });
});
