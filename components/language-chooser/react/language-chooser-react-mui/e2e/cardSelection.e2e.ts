import { test, expect, Page } from "@playwright/test";
import {
  clearSearch,
  clickLanguageCard,
  createPageAndLoadLanguageChooser,
  findCyrlCard,
  findUzbekCard,
  scriptCardTestId,
} from "./e2eHelpers";

let page: Page; // All the tests in this file use the same page object to save time; we only load the language chooser once.

test.describe("Selection toggle script card behavior", () => {
  test.beforeAll(async ({ browser }) => {
    page = await createPageAndLoadLanguageChooser(browser);
  });
  test.beforeEach(async () => {
    await clearSearch(page);
  });

  test("selecting langauge card makes script card visible", async () => {
    // Cyrillic card is initially not visible
    const uzbekCard = await findUzbekCard(page);
    const cyrlCardTestId = scriptCardTestId("Cyrl");
    await expect(page.getByTestId(cyrlCardTestId)).not.toBeVisible();

    // select Uzbek card
    await uzbekCard.click();

    // Cyrillic card is now visible and contains some text with "Cyr..."
    const cyrlCard = page.getByTestId(cyrlCardTestId);
    await expect(cyrlCard).toBeVisible();
    await expect(cyrlCard).toContainText(/Cyr.*/);
  });

  test("re-clicking (toggle unselecting) language card hides script card", async () => {
    const cyrlCard = await findCyrlCard(page);
    clickLanguageCard(page, "uzb");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Selecting different language card hides previous selection script cards", async () => {
    const cyrlCard = await findCyrlCard(page);

    // select Uzbeki Arabic, which does not have a Cyrillic script card
    clickLanguageCard(page, "auz");
    await expect(cyrlCard).not.toBeVisible();
  });

  test("Adding to search string clears selections", async () => {
    const cyrlCard = await findCyrlCard(page);

    // Add to search string
    await page.locator("#search-bar").fill("uzbek ");
    await expect(cyrlCard).not.toBeVisible();
  });
});
