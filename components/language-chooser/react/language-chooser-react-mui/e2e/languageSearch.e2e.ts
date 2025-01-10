import { test, expect } from "@playwright/test";
import { clearSearch, languageCardTestId, search } from "./e2eHelpers";

test.describe("Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("basic search by name", async ({ page }) => {
    await clearSearch(page);
    await search(page, "tok pisin");
    const tpiCard = page.getByTestId(languageCardTestId("tpi"));
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText("Tok Pisin");
  });

  test("basic search by code", async ({ page }) => {
    await clearSearch(page);
    await search(page, "tpi");
    const tpiCard = page.getByTestId(languageCardTestId("tpi"));
    await tpiCard.scrollIntoViewIfNeeded();
    await expect(tpiCard).toBeVisible();
    await expect(tpiCard).toContainText("Tok Pisin");
  });

  test("basic search by country", async ({ page }) => {
    await clearSearch(page);
    await search(page, "Switzerland");
    const swissGermanCard = page.getByTestId(languageCardTestId("gsw"));
    await swissGermanCard.scrollIntoViewIfNeeded();
    await expect(swissGermanCard).toBeVisible();
    await expect(swissGermanCard).toContainText("Schwiizerdütsch");
  });

  test("X button clears search and results", async ({ page }) => {
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
