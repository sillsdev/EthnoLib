import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  createPageAndLoadLanguageChooser,
  languageCardTestId,
  search,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

test.describe("Search", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("basic search by name", async () => {
    await search(page, "tok pisin");
    const tpiCard = page.getByTestId(languageCardTestId("tpi"));
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText("Tok Pisin");
  });

  test("basic search by code", async () => {
    await search(page, "tpi");
    const tpiCard = page.getByTestId(languageCardTestId("tpi"));
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText("Tok Pisin");
  });

  test("basic search by country", async () => {
    await search(page, "Switzerland");
    const swissGermanCard = page.getByTestId(languageCardTestId("gsw"));
    await swissGermanCard.scrollIntoViewIfNeeded();
    await expect(swissGermanCard).toBeVisible();
    await expect(swissGermanCard).toContainText("Schwiizerdütsch");
  });

  test("search by iso 639-3 code when different from displayed language subtag", async () => {
    // japanese code has iso 639-3 code "jpn" but displays the preferred language subtag "ja" (iso 639-2)
    await search(page, "jpn");
    const card = page.getByTestId(languageCardTestId("jpn"));
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText("Japanese");
  });

  test("search by long tags from langtags.json", async () => {
    await search(page, "soe-Latn-CD");
    const card = await page.getByTestId(languageCardTestId("soe"));
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText(/hendo/);

    await search(page, "soe-Latn");
    await expect(card).toBeVisible();
  });

  test("macrolanguage cards", async () => {
    await search(page, "kau");
    const kauCard = page.getByTestId(languageCardTestId("kau"));
    await kauCard.scrollIntoViewIfNeeded();
    await expect(kauCard).toBeVisible();
    await expect(kauCard).toContainText("Kanuri");
    await expect(kauCard.locator("..")).toContainText(
      "A macrolanguage of Nigeria"
    );

    await search(page, "rajasthani");
    const rajCard = page.getByTestId(languageCardTestId("raj"));
    await rajCard.scrollIntoViewIfNeeded();
    await expect(rajCard).toBeVisible();
    await expect(rajCard).toContainText("Rajasthani");
    await expect(rajCard.locator("..")).toContainText(
      "A macrolanguage of India"
    );
  });

  // see macrolanguageNotes.md
  test("Akan special case", async () => {
    await search(page, "akan");
    const akanCard = page.getByTestId(languageCardTestId("aka"));
    await akanCard.scrollIntoViewIfNeeded();
    await expect(akanCard).toBeVisible();
    await expect(akanCard).toContainText("Akan");
    // language tag should be "ak", not "twi"
    await expect(akanCard).not.toContainText("twi");
  });

  // see macrolanguageNotes.md
  test("Sanskrit special case", async () => {
    await search(page, "sanskrit");
    const sanCard = page.getByTestId(languageCardTestId("san"));
    await sanCard.scrollIntoViewIfNeeded();
    await expect(sanCard).toBeVisible();
    await expect(sanCard).toContainText("Sanskrit");
    // language tag should be "sa", not "cls" or "vsn"
    await expect(sanCard).not.toContainText("cls");
    await expect(sanCard).not.toContainText("vsn");
  });

  test("Chinese special case", async () => {
    await search(page, "chinese");

    const chineseCard = page.getByTestId(languageCardTestId("cmn"));
    await chineseCard.scrollIntoViewIfNeeded();
    await expect(chineseCard).toBeVisible();
    await expect(chineseCard).toContainText(/chinese/i);
    await expect(chineseCard).not.toContainText(/macrolanguage/i);
    await chineseCard.click();

    const zhCard = page.getByTestId(languageCardTestId("zho"));
    await expect(zhCard).not.toBeVisible();

    // Make sure chinese comes up when searching "zh", "cmn", "中文", and "huayu"
    for (const searchTerm of ["zh", "cmn", "中文", "huayu"]) {
      await search(page, searchTerm);
      const chineseCard = page.getByTestId(languageCardTestId("cmn"));
      await chineseCard.scrollIntoViewIfNeeded();
      await expect(chineseCard).toBeVisible();
    }
  });

  test("X button clears search and results", async () => {
    await search(page, "tok pisin");
    // At least one result is visible
    await expect(page.locator(".option-card-button").first()).toBeVisible();

    await clearSearch(page);

    // search bar is empty
    await expect(page.locator("#search-bar")).toHaveText("");

    // no results
    await expect(page.locator(".option-card-button")).not.toBeVisible();
  });

  test("Search by alternative name (synonym)", async () => {
    // Search for a language using an alternative name
    await search(page, "barbadian creole english");

    // Should find Bajan language
    const bajanCard = page.getByTestId(languageCardTestId("bjs"));
    await bajanCard.scrollIntoViewIfNeeded();
    await expect(bajanCard).toBeVisible();
  });

  test("Search with special characters and diacritics", async () => {
    // Search with diacritics for Portuguese
    await search(page, "português");

    const portugueseCard = page.getByTestId(languageCardTestId("por"));
    await portugueseCard.scrollIntoViewIfNeeded();
    await expect(portugueseCard).toBeVisible();

    // Try without diacritics
    await search(page, "portugues");
    await portugueseCard.scrollIntoViewIfNeeded();
    await expect(portugueseCard).toBeVisible();
  });

  test("Search with typos gets fuzzy matches", async () => {
    // Search with a typo for Russian
    await search(page, "rusian");
    const russianCard = page.getByTestId(languageCardTestId("rus"));
    await russianCard.scrollIntoViewIfNeeded();
    await expect(russianCard).toBeVisible();

    await search(page, "jxpanese");
    const japaneseCard = page.getByTestId(languageCardTestId("jpn"));
    await japaneseCard.scrollIntoViewIfNeeded();
    await expect(japaneseCard).toBeVisible();
  });

  test("Search with partial matching shows results", async () => {
    await search(page, "port");

    // Should match Portuguese (Português)
    const portugueseCard = page.getByTestId(languageCardTestId("por"));
    await portugueseCard.scrollIntoViewIfNeeded();
    await expect(portugueseCard).toBeVisible();
  });

  test("Empty search shows no results", async () => {
    await search(page, "");

    // No results should be visible
    const cards = page.locator(".option-card-button");

    // Cards may take time to lazy load, so wait a bit to be sure
    await page.waitForTimeout(200);
    await expect(cards).not.toBeVisible();
  });

  test("Search with no matches clears all cards", async () => {
    // First search for something that has results
    await search(page, "german");

    let cards = page.locator(".option-card-button");
    // Wait for lazy loading
    await expect(cards.first()).toBeVisible();
    let count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Now search for something with no matches
    await search(page, "xyzabc123notarealanguage");

    // If there are cards they may take time to lazyload
    await page.waitForTimeout(500);

    // Should have no visible cards
    cards = page.locator(".option-card-button");
    await expect(cards).not.toBeVisible();
  });

  test("Multiple word search terms work", async () => {
    await search(page, "swiss german");

    const gswCard = page.getByTestId(languageCardTestId("gsw"));
    await gswCard.scrollIntoViewIfNeeded();
    await expect(gswCard).toBeVisible();
    await expect(gswCard.locator("..")).toContainText(
      /Schwiizerdütsch|Swiss German/
    );
  });

  test("Search is case insensitive", async () => {
    // All uppercase
    await search(page, "GERMAN");
    let germanCard = page.getByTestId(languageCardTestId("deu"));
    await germanCard.scrollIntoViewIfNeeded();
    await expect(germanCard).toBeVisible();

    // All lowercase
    await search(page, "german");
    germanCard = page.getByTestId(languageCardTestId("deu"));
    await expect(germanCard).toBeVisible();

    // Mixed case
    await search(page, "GeRmAn");
    germanCard = page.getByTestId(languageCardTestId("deu"));
    await expect(germanCard).toBeVisible();
  });

  test("Search by region shows multiple languages from that region", async () => {
    await search(page, "Afghanistan");

    // Should show multiple languages spoken in Afghanistan
    const cards = page.locator(".option-card-button");
    await expect(cards.nth(3)).toBeVisible();
  });

  test("Search maintains results while scrolling", async () => {
    await search(page, "language");

    let cards = page.locator(".option-card-button");
    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();

    // wait until we have at least 10 results
    await expect(cards.nth(9)).toBeDefined();

    // Scroll down
    const languageCardList = page.locator("#language-card-list");
    await languageCardList.evaluate((el) => {
      el.scrollTop = 500;
    });

    // Should still have results (possibly more due to lazy loading)
    cards = page.locator(".option-card-button");
    const newCount = await cards.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test("Searching for language code in different case finds language", async () => {
    // Try lowercase
    await search(page, "deu");
    let germanCard = page.getByTestId(languageCardTestId("deu"));
    await germanCard.scrollIntoViewIfNeeded();
    await expect(germanCard).toBeVisible();

    // Try uppercase
    await search(page, "DEU");
    germanCard = page.getByTestId(languageCardTestId("deu"));
    await expect(germanCard).toBeVisible();
  });

  test("Search by autonym (native script) finds language", async () => {
    // Search for Japanese using native script
    await search(page, "日本");

    const japaneseCard = page.getByTestId(languageCardTestId("jpn"));
    await japaneseCard.scrollIntoViewIfNeeded();
    await expect(japaneseCard).toBeVisible();
  });

  test("Debounced search updates results correctly", async () => {
    // Type quickly (simulating rapid typing)
    await page.locator("#search-bar").fill("g");
    await page.waitForTimeout(50);
    await page.locator("#search-bar").fill("ge");
    await page.waitForTimeout(50);
    await page.locator("#search-bar").fill("ger");
    await page.waitForTimeout(50);
    await page.locator("#search-bar").fill("germ");
    await page.waitForTimeout(50);
    await page.locator("#search-bar").fill("germa");
    await page.waitForTimeout(50);
    await page.locator("#search-bar").fill("german");

    const germanCard = page.getByTestId(languageCardTestId("deu"));
    await germanCard.scrollIntoViewIfNeeded();
    await expect(germanCard).toBeVisible();
  });

  test("Language list scrolls to top when search changes", async () => {
    // Search for something that produces many results
    await search(page, "language");

    const languageCardList = page.locator("#language-card-list");

    // Scroll down in the list
    await languageCardList.evaluate((el) => {
      el.scrollTop = 500;
    });

    // Verify we've scrolled
    let scrollTop = await languageCardList.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(400);

    // Change the search
    await search(page, "russian");

    // Wait for results to update
    await page.waitForTimeout(300);

    // Should have scrolled back to top
    scrollTop = await languageCardList.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeLessThan(100);
  });
});
