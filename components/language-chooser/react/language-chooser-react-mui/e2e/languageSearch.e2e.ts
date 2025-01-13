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
