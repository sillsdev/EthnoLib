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
});
